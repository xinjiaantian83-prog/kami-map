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
  var DEFAULT_CENTER = [33.7894, 132.7857]; // 中予エリア中心
  var DEFAULT_ZOOM = 13;
  var DATA_URL = 'data/region/chuyo/recycle/boxes.json';
  var EVACUATION_DATA_URLS = [
    'data/region/chuyo/shelters/matsuyama.json',
    'data/region/chuyo/shelters/tobe.json',
    'data/region/chuyo/shelters/masaki.json',
    'data/region/chuyo/shelters/toon.json',
    'data/region/chuyo/shelters/iyo.json',
  ];
  var AED_DATA_URLS = [
    'data/region/chuyo/aed/matsuyama.json',
    'data/region/chuyo/aed/iyo.json',
    'data/region/chuyo/aed/toon.json',
    'data/region/chuyo/aed/kumakogen.json',
  ];
  var STATUS_REPORT_URL = 'https://script.google.com/macros/s/AKfycby3qNQUaJC1rauPHzlaiL5jV7PyTdGtlS0vJg6qIU_4GB7_2mCjkO6aHIRL_pk-tRcK/exec';
  var STATUS_REPORT_MAX_DISTANCE_METERS = 50;
  var REGISTERED_AED_STORAGE_KEY = 'kami-map-registered-aeds';
  var MAX_REGISTERED_AEDS = 3;
  var FIXED_AED_SPOTS = [
    {
      id: 'aed-demo-001',
      type: 'aed',
      name: '松山市役所 本館',
      municipality: '松山市',
      lat: 33.839237,
      lng: 132.765698,
      address: '愛媛県松山市二番町4丁目7-2',
      facilityType: '公共施設',
      availableHours: '利用時間不明',
      indoor: true,
      verified: false,
      photo: '',
      note: '仮データ。AEDモード動作確認用です。',
    },
    {
      id: 'aed-demo-002',
      type: 'aed',
      name: '松山市総合コミュニティセンター',
      municipality: '松山市',
      lat: 33.833923,
      lng: 132.754432,
      address: '愛媛県松山市湊町7丁目5',
      facilityType: '公共施設',
      availableHours: '利用時間不明',
      indoor: true,
      verified: false,
      photo: '',
      note: '仮データ。AEDモード動作確認用です。',
    },
    {
      id: 'aed-demo-003',
      type: 'aed',
      name: '伊予鉄 松山市駅',
      municipality: '松山市',
      lat: 33.83559,
      lng: 132.762047,
      address: '愛媛県松山市湊町5丁目',
      facilityType: '駅',
      availableHours: '利用時間不明',
      indoor: true,
      verified: false,
      photo: '',
      note: '仮データ。AEDモード動作確認用です。',
    },
  ];

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
  var detailRows = Array.prototype.slice.call(document.querySelectorAll('.detail-card__row'));
  var detailPhoto = document.getElementById('detail-photo');
  var detailPhotoImg = document.getElementById('detail-photo-img');
  var detailClose = document.getElementById('detail-close');
  var mapLinkButton = document.getElementById('map-link-button');
  var statusReportToggle = document.getElementById('status-report-toggle');
  var statusReportChoices = document.getElementById('status-report-choices');
  var statusReportMessage = document.getElementById('status-report-message');
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll('.mode-switch__button'));
  var evacuationFilter = document.getElementById('evacuation-filter');
  var evacuationFilterButtons = evacuationFilter ?
    Array.prototype.slice.call(evacuationFilter.querySelectorAll('button[data-distance]')) :
    [];
  var evacuationCount = document.getElementById('evacuation-count');
  var evacuationList = document.getElementById('evacuation-list');
  var evacuationListToggle = document.getElementById('evacuation-list-toggle');
  var evacuationListItems = document.getElementById('evacuation-list-items');
  var stockpileCard = document.getElementById('stockpile-card');
  var stockpileToggle = document.getElementById('stockpile-toggle');
  var stockpileItems = document.getElementById('stockpile-items');

  var appClock = document.getElementById('app-clock');
  var appSubtitle = document.querySelector('.app-subtitle');
  var reportButtonIcon = document.getElementById('report-button-icon');
  var reportButtonText = document.getElementById('report-button-text');

  var STOCKPILE_ITEMS = [
    {
      title: '🧻 ペーパー類',
      text: 'トイレットペーパー・ティッシュ・ウェットティッシュ。普段から1袋多めに。',
    },
    {
      title: '💧 飲料水',
      text: '目安は1人1日3L。最低3日分あると安心。',
    },
    {
      title: '🔋 電池・充電',
      text: '乾電池、モバイルバッテリー、充電ケーブル。半年〜1年に一度確認。',
    },
    {
      title: '🕯 灯り',
      text: '懐中電灯、LEDランタン、蝋燭、ライター。停電時に役立つ。',
    },
    {
      title: '🚽 トイレ用品',
      text: '簡易トイレ、ゴミ袋、消臭袋。断水時に重要。',
    },
    {
      title: '💊 日用品',
      text: '常備薬、マスク、生理用品、子供用品、ペット用品。',
    },
  ];
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

  function distanceMeters(lat1, lng1, lat2, lng2) {
    var earthRadiusMeters = 6371000;
    var toRad = function (value) {
      return value * Math.PI / 180;
    };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  function findNearestEvacuationSite(latlng) {
    if (!Array.isArray(evacuationSites) || evacuationSites.length === 0) return null;

    return evacuationSites.reduce(function (nearest, site) {
      if (typeof site.lat !== 'number' || typeof site.lng !== 'number') return nearest;

      var distance = distanceMeters(latlng.lat, latlng.lng, site.lat, site.lng);
      if (!nearest || distance < nearest.distance) {
        return {
          site: site,
          distance: distance,
        };
      }

      return nearest;
    }, null);
  }

  function formatDistance(meters) {
    if (meters >= 1000) {
      return (meters / 1000).toFixed(1) + 'km';
    }

    return Math.round(meters) + 'm';
  }

  function formatElevation(elevation) {
    if (elevation === null || elevation === undefined || isNaN(Number(elevation))) return '—';
    var value = Number(elevation);
    return Math.abs(value % 1) < 0.05 ? Math.round(value) + 'm' : value.toFixed(1) + 'm';
  }

  function getElevationLevel(elevation) {
    if (elevation === null || elevation === undefined || isNaN(Number(elevation))) return 'unknown';
    var value = Number(elevation);
    if (value < 5) return 'low';
    if (value >= 20) return 'high';
    return 'mid';
  }

  function getEvacuationItemsByDistance() {
    var items = evacuationSites
      .map(function (site) {
        return {
          site: site,
          distance: lastKnownLatLng ?
            distanceMeters(lastKnownLatLng.lat, lastKnownLatLng.lng, site.lat, site.lng) :
            null,
        };
      });

    if (!lastKnownLatLng) return items;

    items.sort(function (a, b) {
      return a.distance - b.distance;
    });

    if (selectedEvacuationDistance === 'all') return items;

    return items.filter(function (item) {
      return item.distance <= selectedEvacuationDistance;
    });
  }

  function getAedItemsByDistance() {
    var items = getNearestAedItems();

    if (!lastKnownLatLng || selectedAedDistance === 'all') return items;

    return items.filter(function (item) {
      return item.distance !== null && item.distance <= selectedAedDistance;
    });
  }

  function getNearestEvacuationItems() {
    var items = evacuationSites
      .map(function (site) {
        return {
          site: site,
          distance: lastKnownLatLng ?
            distanceMeters(lastKnownLatLng.lat, lastKnownLatLng.lng, site.lat, site.lng) :
            null,
        };
      });

    if (!lastKnownLatLng) return items;

    return items.sort(function (a, b) {
      return a.distance - b.distance;
    });
  }

  function getNearestAedItems() {
    return aedSpots
      .map(function (spot) {
        return {
          spot: spot,
          distance: lastKnownLatLng ?
            distanceMeters(lastKnownLatLng.lat, lastKnownLatLng.lng, spot.lat, spot.lng) :
            null,
        };
      })
      .sort(function (a, b) {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
  }

  function updateEvacuationSummary(displayItems, nearestItems) {
    if (evacuationCount) {
      evacuationCount.textContent = '表示中 ' + displayItems.length + '件';
    }

    if (!evacuationListItems) return;

    evacuationListItems.innerHTML = '';
    var listItems = nearestItems.slice(0, 5);

    if (evacuationListToggle) {
      evacuationListToggle.textContent = '近くの避難所';
    }

    listItems.forEach(function (item) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.className = 'evacuation-list__name';
      name.textContent = item.site.name;
      li.appendChild(name);

      var meta = document.createElement('span');
      meta.className = 'evacuation-list__meta';
      meta.textContent = (item.site.municipality ? item.site.municipality + ' ・ ' : '') +
        (item.distance !== null ? formatDistance(item.distance) + ' ・ ' : '') +
        '海抜 ' + formatElevation(item.site.elevation);
      li.appendChild(meta);

      evacuationListItems.appendChild(li);
    });

    if (listItems.length === 0) {
      var empty = document.createElement('li');
      empty.textContent = '避難所データがありません';
      evacuationListItems.appendChild(empty);
    }
  }

  function collapseEvacuationList() {
    if (!evacuationList || !evacuationListToggle) return;
    evacuationList.classList.remove('is-expanded');
    document.body.classList.remove('is-evacuation-list-expanded');
    evacuationListToggle.setAttribute('aria-expanded', 'false');
  }

  function collapseStockpileCard() {
    if (!stockpileCard || !stockpileToggle) return;
    stockpileCard.classList.remove('is-expanded');
    document.body.classList.remove('is-stockpile-expanded');
    stockpileToggle.setAttribute('aria-expanded', 'false');
  }

  function renderStockpileItems() {
    if (!stockpileItems) return;
    stockpileItems.innerHTML = '';
    STOCKPILE_ITEMS.forEach(function (item) {
      var block = document.createElement('section');
      block.className = 'stockpile-item';

      var title = document.createElement('h3');
      title.textContent = item.title;
      block.appendChild(title);

      var text = document.createElement('p');
      text.textContent = item.text;
      block.appendChild(text);

      stockpileItems.appendChild(block);
    });
  }

  var DISTANCE_FILTERS = {
    evacuation: [
      { value: '1000', label: '近く 1km' },
      { value: '3000', label: '周辺 3km' },
      { value: '10000', label: '広域 10km' },
      { value: 'all', label: '全部' },
    ],
    aed: [
      { value: '500', label: '近く 500m' },
      { value: '1000', label: '周辺 1km' },
      { value: '3000', label: '広域 3km' },
      { value: 'all', label: '全部' },
    ],
  };

  function getActiveDistanceValue() {
    if (currentMode === 'aed') return String(selectedAedDistance);
    return String(selectedEvacuationDistance);
  }

  function updateDistanceFilterButtons(value) {
    var options = DISTANCE_FILTERS[currentMode] || DISTANCE_FILTERS.evacuation;

    evacuationFilterButtons.forEach(function (button) {
      var index = evacuationFilterButtons.indexOf(button);
      var option = options[index];
      if (option) {
        button.dataset.distance = option.value;
        button.textContent = option.label;
      }
      button.classList.toggle('is-active', button.dataset.distance === value);
    });

    if (evacuationFilter) {
      evacuationFilter.setAttribute(
        'aria-label',
        currentMode === 'aed' ? 'AEDの距離フィルター' : '避難所の距離フィルター'
      );
    }
  }

  function updateEvacuationDistanceButtons(value) {
    updateDistanceFilterButtons(value);
  }

  function setEvacuationDistance(value) {
    if (!lastKnownLatLng) {
      selectedEvacuationDistance = 'all';
      value = 'all';
    } else {
      selectedEvacuationDistance = value === 'all' ? 'all' : Number(value);
    }

    updateEvacuationDistanceButtons(value);

    if (currentMode === 'evacuation') {
      renderMarkers();
    }
  }

  function setAedDistance(value) {
    if (!lastKnownLatLng) {
      selectedAedDistance = 'all';
      value = 'all';
    } else {
      selectedAedDistance = value === 'all' ? 'all' : Number(value);
    }

    updateDistanceFilterButtons(value);

    if (currentMode === 'aed') {
      renderMarkers();
    }
  }

  function requestEvacuationLocationForFilter() {
    selectedEvacuationDistance = 3000;
    waitingForEvacuationLocation = true;
    updateEvacuationDistanceButtons('3000');
    renderMarkers();

    if (!canRequestGeolocation() || !window.navigator || !window.navigator.geolocation) {
      waitingForEvacuationLocation = false;
      setEvacuationDistance('all');
      return;
    }

    map.locate({
      setView: false,
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000,
    });
  }

  function requestAedLocationForFilter() {
    selectedAedDistance = 1000;
    waitingForAedLocation = true;
    updateDistanceFilterButtons('1000');
    renderMarkers();

    if (!canRequestGeolocation() || !window.navigator || !window.navigator.geolocation) {
      waitingForAedLocation = false;
      setAedDistance('all');
      return;
    }

    map.locate({
      setView: false,
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000,
    });
  }

  function getCurrentPosition() {
    return new Promise(function (resolve, reject) {
      if (!canRequestGeolocation()) {
        reject(new Error('insecure-geolocation'));
        return;
      }

      if (!window.navigator || !window.navigator.geolocation) {
        reject(new Error('unsupported-geolocation'));
        return;
      }

      window.navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      });
    });
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
    lastKnownLatLng = latlng;

    if (!currentLocationMarker) {
      currentLocationMarker = L.marker(latlng, {
        icon: createCurrentLocationIcon(),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      currentLocationMarker.setLatLng(latlng);
    }

    if (currentMode === 'evacuation') {
      if (waitingForEvacuationLocation) {
        waitingForEvacuationLocation = false;
        selectedEvacuationDistance = 3000;
        updateDistanceFilterButtons('3000');
      }

      var nearest = findNearestEvacuationSite(latlng);
      if (nearest) {
        showToast('最寄り避難所: ' + nearest.site.name + '（約' + formatDistance(nearest.distance) + '）');
      }
      renderMarkers();
    }

    if (currentMode === 'aed') {
      if (waitingForAedLocation) {
        waitingForAedLocation = false;
        selectedAedDistance = 1000;
        updateDistanceFilterButtons('1000');
      }

      renderMarkers();
    }

    resetLocateButton();
  });

  map.on('locationerror', function (e) {
    resetLocateButton();
    if (currentMode === 'evacuation' && waitingForEvacuationLocation && !lastKnownLatLng) {
      waitingForEvacuationLocation = false;
      setEvacuationDistance('all');
    }
    if (currentMode === 'aed' && waitingForAedLocation && !lastKnownLatLng) {
      waitingForAedLocation = false;
      setAedDistance('all');
    }
    showToast(getLocationErrorMessage(e));
  });

  locateBtn.addEventListener('click', moveToCurrentLocation);

  // -----------------------------
  // 満タン率レポート
  // -----------------------------
  var currentSpot = null;
  var currentMode = 'paper';
  var markersLayer = L.layerGroup().addTo(map);
  var paperSpots = [];
  var evacuationSites = [];
  var aedSpots = FIXED_AED_SPOTS.slice();
  var registeredAedIds = loadRegisteredAeds();
  var selectedEvacuationDistance = 3000;
  var selectedAedDistance = 1000;
  var lastKnownLatLng = null;
  var waitingForEvacuationLocation = false;
  var waitingForAedLocation = false;

  var STATUS_LABELS = {
    empty: '🟢 空きあり',
    half: '🟡 半分くらい',
    full: '🔴 満タン近い',
    unknown: '未報告',
  };

  function loadRegisteredAeds() {
    try {
      var data = JSON.parse(localStorage.getItem(REGISTERED_AED_STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.slice(0, MAX_REGISTERED_AEDS) : [];
    } catch (e) {
      return [];
    }
  }

  function saveRegisteredAeds() {
    localStorage.setItem(REGISTERED_AED_STORAGE_KEY, JSON.stringify(registeredAedIds.slice(0, MAX_REGISTERED_AEDS)));
  }

  function isAedRegistered(id) {
    return registeredAedIds.indexOf(id) !== -1;
  }

  function toggleRegisteredAed(spot) {
    var index = registeredAedIds.indexOf(spot.id);
    if (index !== -1) {
      registeredAedIds.splice(index, 1);
      showToast('登録AEDから外しました');
    } else {
      if (registeredAedIds.length >= MAX_REGISTERED_AEDS) {
        showToast('登録AEDは3件までです');
        return;
      }
      registeredAedIds.push(spot.id);
      showToast('登録AEDに追加しました');
    }
    saveRegisteredAeds();
    showDetail(spot);
    renderMarkers();
  }

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

    var imageKey = spot.photoId || spot.id;
    if (!imageKey) return;

    var basePath = 'images/spots/' + encodeURIComponent(imageKey);
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

    getCurrentPosition()
      .then(function (position) {
        var distance = distanceMeters(
          position.coords.latitude,
          position.coords.longitude,
          spot.lat,
          spot.lng
        );

        if (distance > STATUS_REPORT_MAX_DISTANCE_METERS) {
          statusReportMessage.textContent = '現地付近でのみ報告できます（50m以内）';
          return;
        }

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
      })
      .catch(function (err) {
        console.error(err);
        statusReportMessage.textContent = getLocationErrorMessage(err);
      })
      .finally(function () {
        setStatusReportLoading(false);
      });
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
        '<svg class="spot-marker__box" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
        '<path class="spot-marker__box-fill" d="M7 11.5 16 8l9 3.5v13L16 28l-9-3.5z"/>' +
        '<path class="spot-marker__box-line" d="M7 11.5 16 15l9-3.5M16 15v13M7 11.5v13L16 28l9-3.5v-13L16 8z"/>' +
        '<path class="spot-marker__box-line" d="M7 19h9"/>' +
        '</svg>' +
        '</div>',
      iconSize: [40, 48],
      iconAnchor: [20, 46],
      popupAnchor: [0, -40],
    });
  }

  function createEvacuationIcon() {
    return L.divIcon({
      className: 'evacuation-marker',
      html:
        '<div class="evacuation-marker__pin">' +
        '<svg class="evacuation-marker__symbol" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
        '<path class="evacuation-marker__roof" d="M5 15.5 16 7l11 8.5"/>' +
        '<path class="evacuation-marker__house" d="M8.5 14.5v10h15v-10"/>' +
        '<circle class="evacuation-marker__person" cx="16" cy="16.5" r="2.3"/>' +
        '<path class="evacuation-marker__person-line" d="M16 19v5.2M12.8 22h6.4"/>' +
        '</svg>' +
        '</div>',
      iconSize: [42, 50],
      iconAnchor: [21, 48],
      popupAnchor: [0, -42],
    });
  }

  function createAedIcon(spot) {
    return L.divIcon({
      className: 'aed-marker' + (isAedRegistered(spot.id) ? ' is-registered' : ''),
      html: '<div class="aed-marker__pin"><span class="aed-marker__heart">♥</span></div>',
      iconSize: [40, 48],
      iconAnchor: [20, 46],
      popupAnchor: [0, -40],
    });
  }

  function updateModeButtons() {
    document.body.dataset.mode = currentMode;
    if (appSubtitle) {
      appSubtitle.textContent = currentMode === 'evacuation' ?
        '松山市 避難所モードβ' :
        currentMode === 'aed' ?
          '近くのAED設置場所' :
          '近くの古紙・段ボール回収ボックス';
    }

    if (reportButtonIcon && reportButtonText) {
      var reportButtonContent = currentMode === 'evacuation' ?
        { icon: '🏠', text: '避難所情報を確認する' } :
        currentMode === 'aed' ?
          { icon: '❤️', text: 'AED設置場所を確認する' } :
          { icon: '📦', text: '回収ボックスを見つけたら教えてください' };

      reportButtonIcon.textContent = reportButtonContent.icon;
      reportButtonText.textContent = reportButtonContent.text;
    }

    modeButtons.forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.mode === currentMode);
    });

    if (currentMode === 'evacuation' || currentMode === 'aed') {
      updateDistanceFilterButtons(getActiveDistanceValue());
    }
  }

  function renderMarkers() {
    markersLayer.clearLayers();
    closeDetail();

    var evacuationItems = currentMode === 'evacuation' ? getEvacuationItemsByDistance() : [];
    var nearestEvacuationItems = currentMode === 'evacuation' ? getNearestEvacuationItems() : [];
    var aedItems = currentMode === 'aed' ? getAedItemsByDistance() : [];
    var data = currentMode === 'evacuation' ?
      evacuationItems.map(function (item) { return item.site; }) :
      currentMode === 'aed' ?
        aedItems.map(function (item) { return item.spot; }) :
        paperSpots;
    var bounds = [];

    data.forEach(function (spot) {
      if (typeof spot.lat !== 'number' || typeof spot.lng !== 'number') return;

      var marker = L.marker([spot.lat, spot.lng], {
        icon: currentMode === 'evacuation' ?
          createEvacuationIcon() :
          currentMode === 'aed' ?
            createAedIcon(spot) :
            createMarkerIcon(),
        title: spot.title || spot.name,
        riseOnHover: true,
      }).addTo(markersLayer);

      if (currentMode === 'evacuation') {
        marker.getElement().classList.add('is-elevation-' + getElevationLevel(spot.elevation));
      }

      marker.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        showDetail(spot);
        map.panTo([spot.lat, spot.lng], { animate: true });
      });

      bounds.push([spot.lat, spot.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, {
        paddingTopLeft: [40, 40],
        paddingBottomRight: currentMode === 'evacuation' ? [40, 180] : [40, 40],
        maxZoom: currentMode === 'evacuation' ? 13 : currentMode === 'aed' ? 15 : 14,
      });
    }

    if (currentMode === 'evacuation') {
      updateEvacuationSummary(evacuationItems, nearestEvacuationItems);
    } else if (currentMode === 'aed' && evacuationCount) {
      evacuationCount.textContent = '表示中 ' + aedItems.length + '件';
    }
  }

  function setMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;
    updateModeButtons();
    collapseEvacuationList();
    collapseStockpileCard();
    if (currentMode === 'evacuation' && !lastKnownLatLng) {
      requestEvacuationLocationForFilter();
      return;
    }
    if (currentMode === 'aed' && !lastKnownLatLng) {
      requestAedLocationForFilter();
      return;
    }
    renderMarkers();
  }

  modeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setMode(button.dataset.mode);
    });
  });
  updateModeButtons();

  evacuationFilterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (currentMode === 'aed') {
        setAedDistance(button.dataset.distance);
        return;
      }

      setEvacuationDistance(button.dataset.distance);
    });
  });

  if (evacuationListToggle && evacuationList) {
    evacuationListToggle.addEventListener('click', function () {
      var isExpanded = evacuationList.classList.toggle('is-expanded');
      document.body.classList.toggle('is-evacuation-list-expanded', isExpanded);
      evacuationListToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
  }

  if (stockpileToggle && stockpileCard) {
    renderStockpileItems();
    stockpileToggle.addEventListener('click', function () {
      var isExpanded = stockpileCard.classList.toggle('is-expanded');
      document.body.classList.toggle('is-stockpile-expanded', isExpanded);
      stockpileToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
  }

  // -----------------------------
  // データ読み込み & ピン配置
  // -----------------------------
  function loadJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('データの読み込みに失敗しました: ' + url + ' ' + res.status);
      return res.json();
    });
  }

  Promise.all([loadJson(DATA_URL)].concat(EVACUATION_DATA_URLS.map(loadJson), AED_DATA_URLS.map(loadJson)))
    .then(function (results) {
      paperSpots = Array.isArray(results[0]) ? results[0] : [];
      var aedDataStart = 1 + EVACUATION_DATA_URLS.length;
      evacuationSites = results.slice(1, aedDataStart).reduce(function (sites, data) {
        return sites.concat(Array.isArray(data) ? data : []);
      }, []);
      aedSpots = results.slice(aedDataStart).reduce(function (spots, data) {
        return spots.concat(Array.isArray(data) ? data : []);
      }, []);
      if (aedSpots.length === 0) {
        aedSpots = FIXED_AED_SPOTS.slice();
      }
      renderMarkers();
    })
    .catch(function (err) {
      console.error(err);
      showToast('地図データを読み込めませんでした。dataフォルダを確認してください。');
    });

  // -----------------------------
  // 詳細カード制御
  // -----------------------------
  function showDetail(spot) {
    currentSpot = spot;
    var isEvacuation = spot.type === 'evacuation';
    var isAed = spot.type === 'aed';
    detailName.textContent = spot.title || spot.name || '名称未設定';
    detailAddress.textContent = (isEvacuation || isAed) && spot.municipality ?
      spot.municipality + ' / ' + (spot.address || '') :
      (spot.address || '');
    detailHours.textContent = isEvacuation ?
      (spot.category || '避難場所') :
      isAed ?
        (spot.availableHours || '利用時間不明') :
        (spot.hours || '—');
    detailRows[0].querySelector('.detail-card__label').textContent = isEvacuation ?
      '対応災害' :
      isAed ?
        '施設種別' :
        '回収品目';
    detailRows[1].querySelector('.detail-card__label').textContent = isEvacuation ?
      '区分' :
      isAed ?
        '利用時間' :
        '利用時間';
    detailRows[2].classList.toggle('is-hidden', isEvacuation || isAed);
    detailRows[3].classList.toggle('is-hidden', isEvacuation || isAed);
    statusReportToggle.closest('.status-report').classList.toggle('is-hidden', isEvacuation || isAed);

    if (isEvacuation || isAed) {
      hideSpotPhoto();
      detailStatus.textContent = '未報告';
      detailReportTime.textContent = '—';
    } else {
      updateSpotPhoto(spot);
      renderDisplayStatus(spot);
    }
    resetStatusReportUi();

    // 品目 / 対応災害タグ
    detailItems.innerHTML = '';
    var tags = isEvacuation ? spot.hazards : isAed ? [spot.facilityType || 'AED'] : spot.items;
    if (Array.isArray(tags) && tags.length > 0) {
      tags.forEach(function (item) {
        var tag = document.createElement('span');
        tag.className = isEvacuation ? 'hazard-tag' : isAed ? 'aed-tag' : 'item-tag';
        tag.textContent = item;
        detailItems.appendChild(tag);
      });
    } else {
      var tag = document.createElement('span');
      tag.className = isEvacuation ? 'hazard-tag' : isAed ? 'aed-tag' : 'item-tag';
      tag.textContent = '情報なし';
      detailItems.appendChild(tag);
    }

    if (isEvacuation) {
      var note = document.createElement('p');
      note.className = 'evacuation-note';
      note.dataset.elevation = getElevationLevel(spot.elevation);
      note.textContent = '海抜: ' + formatElevation(spot.elevation) +
        ' / 収容人数: ' + (spot.capacity === null ? '—' : spot.capacity + '人') +
        ' / 現地確認: ' + (spot.verified ? '済' : '未確認');
      detailItems.appendChild(note);
    }

    if (isAed) {
      if (spot.availableHours === '24時間利用可') {
        var allDayTag = document.createElement('span');
        allDayTag.className = 'aed-tag is-highlight';
        allDayTag.textContent = '24時間利用可';
        detailItems.appendChild(allDayTag);
      }

      if (spot.indoor === false) {
        var outdoorTag = document.createElement('span');
        outdoorTag.className = 'aed-tag is-highlight';
        outdoorTag.textContent = '屋外設置';
        detailItems.appendChild(outdoorTag);
      }

      var nearestAeds = getNearestAedItems();
      var distanceItem = nearestAeds.find(function (item) { return item.spot.id === spot.id; });

      var aedNote = document.createElement('p');
      aedNote.className = 'aed-note';
      aedNote.textContent = '距離: ' + (distanceItem && distanceItem.distance !== null ? formatDistance(distanceItem.distance) : '現在地未取得') +
        ' / 設置: ' + (spot.indoor ? '屋内' : '屋外') +
        (spot.note ? ' / ' + spot.note : '');
      detailItems.appendChild(aedNote);

      var caution = document.createElement('p');
      caution.className = 'aed-note';
      caution.textContent = '※設置場所・利用可能時間は変更される場合があります。緊急時は施設状況をご確認ください。';
      detailItems.appendChild(caution);

      var registerButton = document.createElement('button');
      registerButton.type = 'button';
      registerButton.className = 'register-aed-button' + (isAedRegistered(spot.id) ? ' is-registered' : '');
      registerButton.textContent = isAedRegistered(spot.id) ? '登録AEDから外す' : '登録AEDにする';
      registerButton.addEventListener('click', function () {
        toggleRegisteredAed(spot);
      });
      detailItems.appendChild(registerButton);
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
