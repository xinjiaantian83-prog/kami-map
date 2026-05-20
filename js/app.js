/* ===========================================================
   かみマップ - app.js
   - Leaflet で地図を表示
   - data/spots.json から回収ボックス情報を読み込み
   - ピンタップで詳細カードを表示
   - 下部の投稿ボタンからダミーフォームを表示
   =========================================================== */

(function () {
  'use strict';

  // -----------------------------
  // 設定
  // -----------------------------
  var DEFAULT_CENTER = [35.7100, 139.6500]; // 初期表示位置
  var DEFAULT_ZOOM = 13;
  var DATA_URL = 'data/spots.json';

  // -----------------------------
  // 要素取得
  // -----------------------------
  var detailCard = document.getElementById('detail-card');
  var detailName = document.getElementById('detail-name');
  var detailAddress = document.getElementById('detail-address');
  var detailItems = document.getElementById('detail-items');
  var detailHours = document.getElementById('detail-hours');
  var detailMemo = document.getElementById('detail-memo');
  var detailClose = document.getElementById('detail-close');

  var openReportBtn = document.getElementById('open-report');
  var reportModal = document.getElementById('report-modal');
  var reportForm = document.getElementById('report-form');
  var reportThanks = document.getElementById('report-thanks');

  // -----------------------------
  // 地図初期化
  // -----------------------------
  var map = L.map('map', {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: true,
    attributionControl: true,
    tap: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);

  // 地図クリック時は詳細カードを閉じる
  map.on('click', function () {
    closeDetail();
  });

  // -----------------------------
  // カスタムマーカー作成
  // -----------------------------
  function createMarkerIcon() {
    return L.divIcon({
      className: 'spot-marker',
      html:
        '<div class="spot-marker__pin">' +
        '<span class="spot-marker__icon">紙</span>' +
        '</div>',
      iconSize: [36, 42],
      iconAnchor: [18, 40],
      popupAnchor: [0, -36],
    });
  }

  // -----------------------------
  // データ読み込み & ピン配置
  // -----------------------------
  fetch(DATA_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('データの読み込みに失敗しました: ' + res.status);
      return res.json();
    })
    .then(function (spots) {
      if (!Array.isArray(spots) || spots.length === 0) {
        console.warn('回収ボックスデータが空です');
        return;
      }

      var bounds = [];
      spots.forEach(function (spot) {
        if (typeof spot.lat !== 'number' || typeof spot.lng !== 'number') return;

        var marker = L.marker([spot.lat, spot.lng], {
          icon: createMarkerIcon(),
          title: spot.name,
          riseOnHover: true,
        }).addTo(map);

        marker.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          showDetail(spot);
          map.panTo([spot.lat, spot.lng], { animate: true });
        });

        bounds.push([spot.lat, spot.lng]);
      });

      // 全ピンが見えるように調整（最初の表示）
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    })
    .catch(function (err) {
      console.error(err);
      alert('回収ボックスのデータを読み込めませんでした。data/spots.json を確認してください。');
    });

  // -----------------------------
  // 詳細カード制御
  // -----------------------------
  function showDetail(spot) {
    detailName.textContent = spot.name || '名称未設定';
    detailAddress.textContent = spot.address || '';
    detailHours.textContent = spot.hours || '—';
    detailMemo.textContent = spot.memo || '（メモはありません）';

    // 品目タグ
    detailItems.innerHTML = '';
    if (Array.isArray(spot.items) && spot.items.length > 0) {
      spot.items.forEach(function (item) {
        var tag = document.createElement('span');
        tag.className = 'item-tag';
        tag.textContent = item;
        detailItems.appendChild(tag);
      });
    } else {
      var tag = document.createElement('span');
      tag.className = 'item-tag';
      tag.textContent = '情報なし';
      detailItems.appendChild(tag);
    }

    detailCard.classList.add('is-open');
    detailCard.setAttribute('aria-hidden', 'false');
  }

  function closeDetail() {
    detailCard.classList.remove('is-open');
    detailCard.setAttribute('aria-hidden', 'true');
  }

  detailClose.addEventListener('click', closeDetail);

  // -----------------------------
  // 投稿モーダル制御
  // -----------------------------
  function openReportModal() {
    reportModal.classList.add('is-open');
    reportModal.setAttribute('aria-hidden', 'false');
    reportForm.hidden = false;
    reportThanks.hidden = true;
    reportForm.reset();
  }

  function closeReportModal() {
    reportModal.classList.remove('is-open');
    reportModal.setAttribute('aria-hidden', 'true');
  }

  openReportBtn.addEventListener('click', openReportModal);

  // backdrop / close ボタン
  reportModal.addEventListener('click', function (e) {
    if (e.target.matches('[data-close]')) {
      closeReportModal();
    }
  });

  // フォーム送信（ダミー）
  reportForm.addEventListener('submit', function (e) {
    e.preventDefault();

    // FormData の中身をログに出すだけ（MVPなので保存はしない）
    var data = new FormData(reportForm);
    var payload = {
      name: data.get('name'),
      address: data.get('address'),
      items: data.getAll('items'),
      hours: data.get('hours'),
      memo: data.get('memo'),
    };
    console.log('[投稿ダミー] 送信内容:', payload);

    // 成功UIに切り替え
    reportForm.hidden = true;
    reportThanks.hidden = false;
  });

  // ESCキーで詳細カードとモーダルを閉じる
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (reportModal.classList.contains('is-open')) {
        closeReportModal();
      } else if (detailCard.classList.contains('is-open')) {
        closeDetail();
      }
    }
  });
})();
