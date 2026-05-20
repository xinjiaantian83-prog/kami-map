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
  var STATUS_REPORT_URL = 'https://script.google.com/macros/s/AKfycby3qNQUaJC1rauPHzlaiL5jV7PyTdGtlS0vJg6qIU_4GB7_2mCjkO6aHIRL_pk-tRcK/exec';

  // -----------------------------
  // 要素取得
  // -----------------------------
  var detailCard = document.getElementById('detail-card');
  var detailName = document.getElementById('detail-name');
  var detailAddress = document.getElementById('detail-address');
  var detailItems = document.getElementById('detail-items');
  var detailHours = document.getElementById('detail-hours');
  var detailStatus = document.getElementById('detail-status');
  var detailReportTime = document.getElementById('detail-report-time');
  var detailPhoto = document.getElementById('detail-photo');
  var detailPhotoImg = document.getElementById('detail-photo-img');
  var detailClose = document.getElementById('detail-close');
  var mapLinkButton = document.getElementById('map-link-button');
  var statusReportToggle = document.getElementById('status-report-toggle');
  var statusReportChoices = document.getElementById('status-report-choices');
  var statusReportMessage = document.getElementById('status-report-message');

  var appClock = document.getElementById('app-clock');
  var locateBtn = document.getElementById('locate-button');
  var toast = document.getElementById('toast');

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
  // 現在時刻
  // -----------------------------
  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatClock(date) {
    return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
  }

  function updateClock() {
    if (!appClock) return;

    var now = new Date();
    appClock.textContent = formatClock(now);
    appClock.setAttribute('datetime', now.toISOString());
  }

  updateClock();
  window.setInterval(updateClock, 60000);

  // -----------------------------
  // 現在地
  // -----------------------------
  var currentLocationMarker = null;
  var toastTimer = null;

  function createCurrentLocationIcon() {
    return L.divIcon({
      className: 'current-location-icon',
      html: '<div class="current-location-marker"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  function showToast(message) {
    if (!toast) return;

    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toast.setAttribute('aria-hidden', 'false');

    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
      toast.setAttribute('aria-hidden', 'true');
    }, 4200);
  }

  function isLocalhost() {
    var hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  }

  function canRequestGeolocation() {
    return window.isSecureContext || isLocalhost();
  }

  function resetLocateButton() {
    locateBtn.classList.remove('is-locating');
    locateBtn.removeAttribute('aria-busy');
  }

  function getLocationErrorMessage(e) {
    if (e && e.code === 1) {
      return '位置情報を取得できませんでした。Safariの位置情報許可を確認してください。';
    }

    if (e && e.code === 3) {
      return '位置情報の取得に時間がかかっています。電波状況を確認してもう一度お試しください。';
    }

    return '位置情報を取得できませんでした。Safariの位置情報許可を確認してください。';
  }

  function moveToCurrentLocation() {
    if (!canRequestGeolocation()) {
      showToast('現在地取得はHTTPSまたはlocalhostで利用できます。iPhoneではGitHub PagesなどHTTPS環境で確認してください。');
      return;
    }

    if (!window.navigator || !window.navigator.geolocation) {
      showToast('このブラウザでは現在地を取得できません。Safariの設定を確認してください。');
      return;
    }

    closeDetail();
    locateBtn.classList.add('is-locating');
    locateBtn.setAttribute('aria-busy', 'true');

    map.locate({
      setView: true,
      maxZoom: 16,
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000,
    });
  }

  map.on('locationfound', function (e) {
    var latlng = e.latlng;

    if (!currentLocationMarker) {
      currentLocationMarker = L.marker(latlng, {
        icon: createCurrentLocationIcon(),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      currentLocationMarker.setLatLng(latlng);
    }

    resetLocateButton();
  });

  map.on('locationerror', function (e) {
    resetLocateButton();
    showToast(getLocationErrorMessage(e));
  });

  locateBtn.addEventListener('click', moveToCurrentLocation);

  // -----------------------------
  // 満タン率レポート
  // -----------------------------
  var currentSpot = null;

  var STATUS_LABELS = {
    empty: '🟢 空きあり',
    half: '🟡 半分くらい',
    full: '🔴 満タン近い',
    unknown: '未報告',
  };

  function getResetBoundary(now) {
    var boundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0, 0);
    if (now < boundary) {
      boundary.setDate(boundary.getDate() - 1);
    }
    return boundary;
  }

  function normalizeReports(statusReport) {
    if (Array.isArray(statusReport)) return statusReport;
    if (statusReport && typeof statusReport === 'object') return [statusReport];
    return [];
  }

  function getLatestReport(statusReport) {
    var reports = normalizeReports(statusReport)
      .map(function (report) {
        var reportDate = new Date(report.reportTime);
        return {
          status: report.status,
          reportTime: report.reportTime,
          reportDate: reportDate,
        };
      })
      .filter(function (report) {
        return STATUS_LABELS[report.status] && !isNaN(report.reportDate.getTime());
      });

    if (reports.length === 0) return null;

    reports.sort(function (a, b) {
      return b.reportDate.getTime() - a.reportDate.getTime();
    });

    return reports[0];
  }

  function getDisplayStatus(statusReport) {
    var latest = getLatestReport(statusReport);
    var now = new Date();
    var boundary = getResetBoundary(now);

    if (!latest || latest.reportDate < boundary) {
      return {
        status: 'unknown',
        statusText: STATUS_LABELS.unknown,
        reportTimeText: '—',
      };
    }

    return {
      status: latest.status,
      statusText: STATUS_LABELS[latest.status] || STATUS_LABELS.unknown,
      reportTimeText: formatReportTime(latest.reportDate, now),
    };
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function formatReportTime(reportDate, now) {
    var time = formatClock(reportDate);
    var yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    if (isSameDate(reportDate, now)) {
      return '今日 ' + time;
    }

    if (isSameDate(reportDate, yesterday)) {
      return '昨日 ' + time;
    }

    return (reportDate.getMonth() + 1) + '/' + reportDate.getDate() + ' ' + time;
  }

  function hideSpotPhoto() {
    detailPhoto.hidden = true;
    detailPhotoImg.onload = null;
    detailPhotoImg.onerror = null;
    detailPhotoImg.removeAttribute('src');
  }

  function updateSpotPhoto(spot) {
    hideSpotPhoto();

    if (!spot.id) return;

    var basePath = 'images/spots/' + encodeURIComponent(spot.id);
    var candidates = [
      basePath + '.jpg',
      basePath + '.jpeg',
      basePath + '.JPG',
      basePath + '.JPEG',
    ];
    var currentIndex = 0;

    function tryNextPhoto() {
      if (currentIndex >= candidates.length) {
        hideSpotPhoto();
        return;
      }

      var imagePath = candidates[currentIndex];
      currentIndex += 1;
      console.log('[spot photo] loading:', imagePath);
      detailPhotoImg.src = imagePath;
    }

    detailPhotoImg.onload = function () {
      detailPhoto.hidden = false;
    };

    detailPhotoImg.onerror = function () {
      detailPhoto.hidden = true;
      detailPhotoImg.removeAttribute('src');
      tryNextPhoto();
    };

    tryNextPhoto();
  }

  function renderDisplayStatus(spot) {
    var displayStatus = getDisplayStatus(spot.statusReport);
    detailStatus.textContent = displayStatus.statusText;
    detailStatus.dataset.status = displayStatus.status;
    detailReportTime.textContent = displayStatus.reportTimeText;
  }

  function createGoogleMapsUrl(spot) {
    return 'https://www.google.com/maps/search/?api=1&query=' + spot.lat + ',' + spot.lng;
  }

  mapLinkButton.addEventListener('click', function () {
    if (!currentSpot) return;
    window.open(createGoogleMapsUrl(currentSpot), '_blank');
  });

  function resetStatusReportUi() {
    statusReportChoices.hidden = true;
    statusReportToggle.disabled = false;
    statusReportToggle.textContent = '状態を報告する';
    statusReportMessage.textContent = '';
    Array.prototype.forEach.call(statusReportChoices.querySelectorAll('button'), function (button) {
      button.disabled = false;
    });
  }

  function setStatusReportLoading(isLoading) {
    statusReportToggle.disabled = isLoading;
    statusReportToggle.textContent = isLoading ? '送信中…' : '状態を報告する';
    Array.prototype.forEach.call(statusReportChoices.querySelectorAll('button'), function (button) {
      button.disabled = isLoading;
    });
  }

  function applyLocalStatusReport(spot, status, reportTime) {
    if (!Array.isArray(spot.statusReport)) {
      spot.statusReport = normalizeReports(spot.statusReport);
    }

    spot.statusReport.push({
      status: status,
      reportTime: reportTime,
    });

    renderDisplayStatus(spot);
  }

  function sendStatusReport(status) {
    var spot = currentSpot;

    if (!spot || !spot.id) {
      statusReportMessage.textContent = 'スポット情報を確認できませんでした。';
      return;
    }

    setStatusReportLoading(true);
    statusReportMessage.textContent = '';

    fetch(STATUS_REPORT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        spotId: spot.id,
        status: status,
      }),
    })
      .catch(function (err) {
        console.error(err);
      });

    var reportTime = new Date().toISOString();
    applyLocalStatusReport(spot, status, reportTime);
    statusReportChoices.hidden = true;
    statusReportMessage.textContent = '報告しました';
    setStatusReportLoading(false);
  }

  statusReportToggle.addEventListener('click', function () {
    statusReportChoices.hidden = !statusReportChoices.hidden;
  });

  statusReportChoices.addEventListener('click', function (e) {
    var button = e.target.closest('button[data-status]');
    if (!button) return;
    sendStatusReport(button.dataset.status);
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
    currentSpot = spot;
    detailName.textContent = spot.name || '名称未設定';
    detailAddress.textContent = spot.address || '';
    detailHours.textContent = spot.hours || '—';
    updateSpotPhoto(spot);
    renderDisplayStatus(spot);
    resetStatusReportUi();

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
    currentSpot = null;
    hideSpotPhoto();
    resetStatusReportUi();
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
