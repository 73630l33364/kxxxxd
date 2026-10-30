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

  /* ================= 详情 + 优惠券 ================= */
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
      return '<div style="color:#999;font-size:14px;padding:14px 12px;">未解析到商品列表</div>';
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var priceHtml = '<span style="color:#e94560;font-weight:700;font-size:16px;">'
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
          + '" style="width:72px;height:72px;object-fit:cover;border-radius:6px;background:#f0f0f0;flex:none;" '
          + 'onerror="this.style.visibility=\'hidden\'" />';
      }
      html +=
        '<div style="display:flex;gap:10px;padding:12px;background:#fff;border-bottom:1px solid #eee;align-items:center;">'
        + img
        + '<div style="flex:1;min-width:0;">'
        +   '<div style="font-size:14px;line-height:1.4;color:#333;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">'
        +     escHtml(it.title) + badges
        +   '</div>'
        +   '<div style="margin-top:6px;">' + priceHtml + '</div>'
        +   '<div style="margin-top:4px;font-size:12px;color:#888;">'
        +     (it.sales ? escHtml(it.sales) + ' · ' : '') + escHtml(it.shop)
        +     '<span style="color:#bbb;"> · ' + escHtml(it.itemId) + '</span>'
        +   '</div>'
        + '</div>'
        + '<button data-id="' + escHtml(it.itemId) + '" '
        +   'style="flex:none;height:44px;padding:0 14px;font-size:14px;color:#fff;background:#0f766e;border:none;border-radius:6px;">详情</button>'
        + '</div>';
    }
    return html;
  }


  /* ================= RSA+AES 混合加密（WebCrypto） ================= */
  var RSA_PUB_B64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqzm6XnfuPFEi3044K+6UGyk2uZPksC8ca0YImv0ypHE63Dkxk+PAmMQVtS0dB4n29pu1nB2ApCULkDVaTSmZo83YSSCpCjm1YIF4ONtZaLYAExhF6cDfUue3+BBFDknBtsIswLUQFpyC44Z2b0mOwmkmc4oEc0gGHHO3GHQL5Pirn0AYRu7LytdJhFLbLBjEH0Dw1ZnTdKdmeRnITSfYsW5JM1luMLHOHGIYK4A8yagWIXHZXlbYCuw1Eq1WCEaYxoYAdY60GquwCgiw0fuByvqr8nQ6OQ6+cufT+KxYGXilSn+S6J39rSGg7FvVCOciX6gyXDB+NHgDD2Y2WyOPKQIDAQAB";
  var _rsaKeyPromise = null;
  function _b64ToBuf(b64) {
    var bin = atob(b64);
    var buf = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }
  function _bufToB64(buf) {
    var u8 = new Uint8Array(buf);
    var s = '';
    var CH = 8192;
    for (var i = 0; i < u8.length; i += CH) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    }
    return btoa(s);
  }
  function _importRsaKey() {
    if (!_rsaKeyPromise) {
      _rsaKeyPromise = crypto.subtle.importKey(
        'spki', _b64ToBuf(RSA_PUB_B64),
        { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
      );
    }
    return _rsaKeyPromise;
  }
  function encryptReport(plainText) {
    if (!window.crypto || !crypto.subtle) {
      return Promise.resolve(null);  // 不支持加密，回落明文
    }
    return _importRsaKey().then(function (rsaKey) {
      return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
        .then(function (aesKey) {
          var iv = crypto.getRandomValues(new Uint8Array(12));
          var data = new TextEncoder().encode(plainText);
          return Promise.all([
            crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, data),
            crypto.subtle.exportKey('raw', aesKey)
          ]).then(function (rs) {
            var cipherBuf = rs[0], rawAes = rs[1];
            return crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaKey, rawAes)
              .then(function (encKeyBuf) {
                return JSON.stringify({
                  enc: 'RSA-OAEP-256+A256GCM',
                  k: _bufToB64(encKeyBuf),
                  iv: _bufToB64(iv.buffer),
                  d: _bufToB64(cipherBuf)
                });
              });
          });
        });
    }).catch(function () { return null; });
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

  function showToast(msg) {
    var t = D.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(0,0,0,0.82);color:#fff;font-size:14px;padding:10px 18px;border-radius:8px;z-index:9999;max-width:80%;text-align:center;white-space:nowrap;';
    D.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 1800);
  }


  function copyEncrypted(plainText, cb) {
    encryptReport(plainText).then(function (encJson) {
      var payload = encJson || plainText;
      var ok = copyText(payload);
      cb(ok, encJson ? payload.length : 0);
    });
  }

  /* ================= UI ================= */
  function renderUI() {
    D.body.innerHTML =
      "<meta name='viewport' content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover' />" +
      "<div style='position:fixed;inset:0;background:#f5f5f5;overflow:auto;-webkit-overflow-scrolling:touch;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding-bottom:env(safe-area-inset-bottom,0);'>" +
        "<div style='position:sticky;top:0;background:#0f766e;color:#fff;padding:12px 16px;padding-top:calc(12px + env(safe-area-inset-top,0));box-shadow:0 1px 4px rgba(0,0,0,0.15);z-index:10;'>" +
          "<div style='font-size:17px;font-weight:700;'>Taobao 文搜 + 详情</div>" +
          "<div style='font-size:12px;opacity:0.85;margin-top:2px;'>搜索后点「复制搜索报文」 · 点击商品「详情」复制详情+优惠券</div>" +
        "</div>" +
        "<div style='padding:12px 16px;'>" +
          "<div style='display:flex;gap:8px;margin-bottom:10px;'>" +
            "<input id='query' type='text' value='' placeholder='输入搜索词 query' " +
              "style='flex:1;height:48px;padding:0 14px;font-size:16px;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;background:#fff;' />" +
            "<button id='search' style='height:48px;padding:0 22px;font-size:16px;color:#fff;background:#0f766e;border:none;border-radius:10px;'>搜索</button>" +
          "</div>" +
          "<button id='copySearch' style='width:100%;height:48px;font-size:16px;color:#fff;background:#334155;border:none;border-radius:10px;margin-bottom:10px;' disabled>复制搜索报文</button>" +
          "<div id='status' style='font-size:13px;color:#666;margin-bottom:10px;'>就绪 · 输入关键词后点「搜索」</div>" +
          "<div id='searchList' style='background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden;'>等待搜索...</div>" +
        "</div>" +
      "</div>";

    var queryInput = D.getElementById('query');
    var searchBtn = D.getElementById('search');
    var copySearchBtn = D.getElementById('copySearch');
    var status = D.getElementById('status');
    var searchListEl = D.getElementById('searchList');
    var searchRawJson = null;

    function setStatus(t) { status.textContent = t; }

    function onDetailClick(itemId, btn) {
      setStatus('请求详情+优惠券中... itemId=' + itemId);
      btn.textContent = '请求中';
      btn.disabled = true;

      var detailResp = null, couponResp = null;
      var done = 0;
      function finish() {
        done++;
        if (done < 2) return;
        var payload = { itemId: itemId, alldetail: detailResp, coupon: couponResp };
        var json = JSON.stringify(payload);
        copyEncrypted(json, function (ok, encLen) {
          setStatus(ok ? '详情+优惠券已加密复制（密文 ' + encLen + ' 字符）' : '详情+优惠券请求完成，但复制失败');
          btn.textContent = ok ? '已复制' : '详情';
          btn.disabled = false;
          if (ok) showToast('已加密复制');
        });
      }
      getDetail(itemId).then(function (r) { detailResp = r; finish(); }).catch(function (e) { detailResp = { error: e }; finish(); });
      getCoupon(itemId).then(function (r) { couponResp = r; finish(); }).catch(function (e) { couponResp = { error: e }; finish(); });
    }

    copySearchBtn.addEventListener('click', function () {
      if (!searchRawJson) { showToast('请先搜索'); return; }
      copyEncrypted(searchRawJson, function (ok, encLen) {
        if (ok) { showToast('已加密复制'); setStatus('文搜报文已加密复制（密文 ' + encLen + ' 字符）'); }
        else { setStatus('复制失败'); showToast('复制失败'); }
      });
    });

    searchListEl.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== searchListEl) {
        if (t.tagName === 'BUTTON' && t.getAttribute('data-id')) {
          onDetailClick(t.getAttribute('data-id'), t);
          return;
        }
        t = t.parentNode;
      }
    });

    searchBtn.addEventListener('click', function () {
      var q = (queryInput.value || '').trim();
      if (!q) { setStatus('请输入搜索词 query'); return; }
      setStatus('文搜请求中...');
      searchListEl.innerHTML = '<div style="color:#999;font-size:14px;padding:14px 12px;">请求中...</div>';

      getSearch(q).then(function (r) {
        var respObj = r;
        if (typeof r === 'string') { try { respObj = JSON.parse(r); } catch (e) { respObj = r; } }
        searchRawJson = JSON.stringify({ keyword: q, data: respObj });
        var items = parseSearchItems(r);
        searchListEl.innerHTML = renderSearchItems(items);
        copySearchBtn.disabled = false;
        setStatus('文搜 OK · 共 ' + items.length + ' 个商品 · 点「复制搜索报文」复制');
      }).catch(function (e) {
        searchRawJson = null;
        copySearchBtn.disabled = true;
        searchListEl.innerHTML = '<div style="color:#e94560;font-size:14px;padding:14px 12px;">[FAIL]</div>';
        setStatus('文搜失败: ' + JSON.stringify(e));
      });
    });
  }

  renderUI();
})();
