(function () {
  'use strict';

  var W = window;
  var D = document;

  /* ================= mtop 封装 ================= */
  function mtopSend(api, param, version) {
    return new Promise(function (resolve, reject) {
      if (!W.__windvane__ || !W.__windvane__.call) { reject('no __windvane__ bridge'); return; }
      var p = {
        api: api,
        v: version || '1.0',
        post: '1',
        type: '',
        isHttps: '0',
        ecode: '0',
        isSec: '0',
        param: param,
        timer: 30000,
        needLogin: true,
        sessionOption: 'AutoLoginOnly',
        ext_headers: {},
        ext_querys: {}
      };
      W.__windvane__.call('MtopWVPlugin.send', p, resolve, reject, 10000);
    });
  }

  /* ================= 文搜参数（MtopRecommend.recommend） ================= */
  function buildSearchParam(query) {
    return {
      q: query,
      appId: '66',
      sversion: '29.9',
      spm: 'a2141.1.searchbar.searchbox',
      scm: '1007.home_topbar.searchbox.d',
      search_action: 'initiative',
      from: 'nt_history',
      sugg: '_0_1',
      index: '0',
      vm: 'nw',
      schemaType: 'auction',
      style: 'list',
      isEnterSrpSearch: 'true',
      needTabs: 'true',
      searchBoxShowType: 'UOne',
      layeredSrp: 'true',
      tb2025: 'true',
      ShopSDKModuleType: 'local',
      grayHair: 'false',
      elderHome: 'false',
      searchElderHomeOpen: 'false',
      homePageVersion: 'v7',
      enablePicShot: 'true',
      isBeta: 'false',
      gpsEnabled: 'false',
      history_query_from: 'suggest_all-queryBE2',
      extra_data_key: 's.m.taobao.com/h5entry',
      mainChannel: ''
    };
  }

  function getSearch(query) {
    return mtopSend('mtop.relationrecommend.MtopRecommend.recommend', buildSearchParam(query), '1.0');
  }

  /* ================= 结果解析 ================= */
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function findItemsArray(resp) {
    if (typeof resp === 'string') {
      try { resp = JSON.parse(resp); } catch (e) { return null; }
    }
    if (Array.isArray(resp)) return resp;
    if (!resp || typeof resp !== 'object') return null;
    if (Array.isArray(resp.itemsArray)) return resp.itemsArray;
    if (resp.data) {
      var d = resp.data;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch (e) { return null; }
      }
      if (Array.isArray(d)) return d;
      if (d && typeof d === 'object') {
        if (Array.isArray(d.itemsArray)) return d.itemsArray;
        if (Array.isArray(d.items)) return d.items;
        if (Array.isArray(d.auctions)) return d.auctions;
      }
    }
    return null;
  }

  function parseSearchItems(resp) {
    var arr = findItemsArray(resp);
    if (!arr) return [];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (!it || typeof it !== 'object') continue;
      var itemId = it.item_id || it.nid || it.auctionId;
      if (!itemId) continue;
      var priceShow = it.priceShow || {};
      var showPrice = priceShow.price != null ? String(priceShow.price) : String(it.price || '');
      var origPrice = (it.price != null && String(it.price) !== '0.00' && String(it.price) !== '0'
        && String(it.price) !== showPrice) ? String(it.price) : '';
      var shopList = (it.shopInfo && it.shopInfo.shopInfoList) || [];
      out.push({
        itemId: String(itemId),
        title: it.title || it.raw_title || '',
        price: showPrice,
        unit: priceShow.unit || '¥',
        origPrice: origPrice,
        sales: it.realSales || it.view_sales || '',
        shop: shopList.length ? shopList[0] : '',
        pic: it.pic_path || '',
        cardType: it.cardType || '',
        isP4p: !!it.isP4p
      });
    }
    return out;
  }

  function renderSearchItems(items) {
    if (!items.length) {
      return '<div style="color:#999;font-size:13px;padding:8px 0;">未解析到商品列表</div>';
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var priceHtml = '<span style="color:#e94560;font-weight:700;font-size:15px;">'
        + escHtml(it.unit) + escHtml(it.price) + '</span>';
      if (it.origPrice) {
        priceHtml += ' <span style="color:#999;font-size:12px;text-decoration:line-through;">'
          + escHtml(it.unit) + escHtml(it.origPrice) + '</span>';
      }
      var badges = '';
      if (it.cardType === 'live') badges += '<span style="color:#fff;background:#ff6600;font-size:11px;padding:1px 5px;border-radius:3px;margin-left:6px;">直播</span>';
      if (it.isP4p) badges += '<span style="color:#fff;background:#bbb;font-size:11px;padding:1px 5px;border-radius:3px;margin-left:6px;">广告</span>';
      var img = '';
      if (it.pic) {
        img = '<img src="' + escHtml(it.pic.replace(/^http:/, 'https:'))
          + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;background:#f0f0f0;flex:none;" '
          + 'onerror="this.style.visibility=\'hidden\'" />';
      }
      html += '<div style="display:flex;gap:10px;padding:10px;border-bottom:1px solid #eee;align-items:flex-start;">'
        + img
        + '<div style="flex:1;min-width:0;">'
        +   '<div style="font-size:13px;line-height:1.45;color:#333;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">'
        +     escHtml(it.title) + badges
        +   '</div>'
        +   '<div style="margin-top:6px;">' + priceHtml + '</div>'
        +   '<div style="margin-top:4px;font-size:12px;color:#888;">'
        +     (it.sales ? escHtml(it.sales) + ' · ' : '') + escHtml(it.shop)
        +     '<span style="color:#bbb;"> · ' + escHtml(it.itemId) + '</span>'
        +   '</div>'
        + '</div></div>';
    }
    return html;
  }

  function copyText(text) {
    if (!text) return false;
    var ta = D.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    D.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { ta.setSelectionRange(0, text.length); } catch (e) {}
    var ok = false;
    try { ok = D.execCommand('copy'); } catch (e) { ok = false; }
    D.body.removeChild(ta);
    return ok;
  }

  /* ================= UI ================= */
  function renderUI() {
    D.body.innerHTML =
      "<div style='position:fixed;inset:0;background:#fff;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:16px;box-sizing:border-box;'>" +
        "<h1 style='font-size:18px;margin:0 0 12px;color:#0f766e;'>Taobao 文搜</h1>" +
        "<div style='display:flex;gap:8px;margin-bottom:12px;'>" +
          "<input id='query' type='text' value='' placeholder='输入搜索词 query' " +
            "style='flex:1;height:44px;padding:0 12px;font-size:15px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;' />" +
          "<button id='search' style='height:44px;padding:0 20px;font-size:15px;color:#fff;background:#0f766e;border:none;border-radius:6px;'>搜索</button>" +
        "</div>" +
        "<div id='status' style='font-size:13px;color:#666;margin-bottom:12px;'>就绪 · 输入关键词后点「搜索」</div>" +
        "<div id='searchList' style='background:#fff;border:1px solid #eee;border-radius:6px;overflow:hidden;margin:0 0 8px;'>等待搜索...</div>" +
        "<div style='margin:0 0 8px;'>" +
          "<button id='copyJson' style='height:36px;padding:0 16px;font-size:13px;color:#fff;background:#334155;border:none;border-radius:6px;'>复制原始JSON报文</button>" +
        "</div>" +
        "<details style='margin:0;'><summary style='font-size:12px;color:#666;cursor:pointer;'>原始 JSON</summary>" +
          "<pre id='searchResult' style='white-space:pre-wrap;word-break:break-all;font-size:11px;background:#f6f7f9;border:1px solid #eee;border-radius:6px;padding:10px;max-height:50vh;overflow:auto;margin:6px 0 0;'>等待请求...</pre>" +
        "</details>" +
      "</div>";

    var queryInput = D.getElementById('query');
    var searchBtn = D.getElementById('search');
    var status = D.getElementById('status');
    var searchResultEl = D.getElementById('searchResult');
    var searchListEl = D.getElementById('searchList');
    var copyJsonBtn = D.getElementById('copyJson');
    var searchRawJson = null;

    function setStatus(t) { status.textContent = t; }

    searchBtn.addEventListener('click', function () {
      var q = (queryInput.value || '').trim();
      if (!q) { setStatus('请输入搜索词 query'); return; }
      setStatus('文搜请求中...');
      searchListEl.innerHTML = '<div style="color:#999;font-size:13px;padding:8px 10px;">请求中...</div>';
      searchResultEl.textContent = '请求中...';

      getSearch(q).then(function (r) {
        searchRawJson = JSON.stringify(r, null, 1);
        searchResultEl.textContent = searchRawJson;
        var items = parseSearchItems(r);
        searchListEl.innerHTML = renderSearchItems(items);
        setStatus('文搜 OK · 共 ' + items.length + ' 个商品');
      }).catch(function (e) {
        searchRawJson = null;
        searchListEl.innerHTML = '<div style="color:#e94560;font-size:13px;padding:8px 10px;">[FAIL]</div>';
        searchResultEl.textContent = '[FAIL] ' + JSON.stringify(e);
        setStatus('文搜失败');
      });
    });

    copyJsonBtn.addEventListener('click', function () {
      if (!searchRawJson) { setStatus('请先执行搜索'); return; }
      var ok = copyText(searchRawJson);
      setStatus(ok ? '已复制原始 JSON（' + searchRawJson.length + ' 字符）' : '复制失败');
    });
  }

  renderUI();
})();
