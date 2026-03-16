/* ================================================
   IRCTC Tatkal Booking Simulator - JavaScript
   ================================================ */

// -- BACKEND CONNECTION --
const BASE_URL = 'https://irctc-tatkal-simulation-production.up.railway.app/api';

function getToken() { return localStorage.getItem('token'); }

function getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
}

// -- STATION DATA --
const STATIONS = [
    { name: 'Mumbai', code: 'BCT', state: 'Maharashtra' },
    { name: 'Delhi', code: 'NDLS', state: 'Delhi' },
    { name: 'Chennai', code: 'MAS', state: 'Tamil Nadu' },
    { name: 'Kolkata', code: 'HWH', state: 'West Bengal' },
    { name: 'Bangalore', code: 'SBC', state: 'Karnataka' },
    { name: 'Hyderabad', code: 'HYB', state: 'Telangana' },
    { name: 'Pune', code: 'PUNE', state: 'Maharashtra' },
    { name: 'Ahmedabad', code: 'ADI', state: 'Gujarat' },
    { name: 'Lucknow', code: 'LKO', state: 'Uttar Pradesh' },
    { name: 'Patna', code: 'PNBE', state: 'Bihar' },
    { name: 'Bhopal', code: 'BPL', state: 'Madhya Pradesh' },
    { name: 'Varanasi', code: 'BSB', state: 'Uttar Pradesh' },
    { name: 'Amritsar', code: 'ASR', state: 'Punjab' },
    { name: 'Nashik', code: 'NK', state: 'Maharashtra' },
    { name: 'Jaipur', code: 'JP', state: 'Rajasthan' },
    { name: 'Ajmer', code: 'AII', state: 'Rajasthan' },
    { name: 'Jodhpur', code: 'JU', state: 'Rajasthan' },
    { name: 'Guwahati', code: 'GHY', state: 'Assam' },
    { name: 'Kochi', code: 'ERS', state: 'Kerala' },
    { name: 'Thiruvananthapuram', code: 'TVC', state: 'Kerala' },
    { name: 'Gorakhpur', code: 'GKP', state: 'Uttar Pradesh' },
];

// -- SIMULATED PEOPLE --
const SIM_PEOPLE = [
    { name: 'Arjun Mehta', pnr: '38291047', seat: 'B1/12', status: 'conf' },
    { name: 'Sneha Iyer', pnr: '47102938', seat: 'B1/24', status: 'conf' },
    { name: 'Rohit Verma', pnr: '56382910', seat: 'S1/5', status: 'conf' },
    { name: 'Divya Nair', pnr: null, seat: null, status: 'sold' },
    { name: 'Karthik R.', pnr: '62019384', seat: 'A1/3', status: 'conf' },
    { name: 'Priya M.', pnr: null, seat: null, status: 'wait' },
    { name: 'Kavya N.', pnr: '50919417', seat: 'B1/42', status: 'conf' },
    { name: 'Kavya N.', pnr: null, seat: null, status: 'sold' },
    { name: 'Rahul S.', pnr: '27006283', seat: 'B1/57', status: 'conf' },
    { name: 'Rahul Sharma', pnr: '29802650', seat: 'S2/9', status: 'conf' },
];

// -- STATE --
let seatSecs = 30,
    seatInterval = null;
let tatkalLive = false,
    tatkalCountdown = 15,
    tatkalInterval = null;
let activityItems = [],
    simIndex = 0,
    simInterval = null;
let userBooked = false;
let queueDepth = 847;

// -- TOAST --
function showToast(msg) {
    const t = document.getElementById('toastEl');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 3000);
}

// -- SCREENS --
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (id === 'scrDash' && !tatkalLive) startTatkalCountdown();
    if (id === 'scrBookings') loadMyBookings();
}

// -- AUTOCOMPLETE --
function acFilter(field) {
    const inputEl = document.getElementById(field === 'from' ? 'fromInput' : 'toInput');
    const ddEl = document.getElementById(field === 'from' ? 'acFrom' : 'acTo');
    const q = inputEl.value.trim().toLowerCase();
    const filtered = q.length === 0 ? STATIONS.slice(0, 10) : STATIONS.filter(function(s) {
        return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.state.toLowerCase().includes(q);
    }).slice(0, 8);
    ddEl.innerHTML = filtered.map(function(s) {
        return '<div class="ac-item" onmousedown="acSelect(\'' + field + '\',\'' + s.name + '\')"><span class="ac-item-icon">&#x1F689;</span><div><div class="ac-item-main">' + s.name + '</div><div class="ac-item-sub">' + s.state + '</div></div><span class="ac-item-code">' + s.code + '</span></div>';
    }).join('');
    ddEl.classList.toggle('open', filtered.length > 0);
}

function acSelect(field, name) {
    document.getElementById(field === 'from' ? 'fromInput' : 'toInput').value = name;
    document.getElementById(field === 'from' ? 'acFrom' : 'acTo').classList.remove('open');
}

function acClose(field, delay) {
    setTimeout(function() {
        document.getElementById(field === 'from' ? 'acFrom' : 'acTo').classList.remove('open');
    }, delay);
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-wrap')) {
        document.querySelectorAll('.autocomplete-dropdown').forEach(function(d) { d.classList.remove('open'); });
    }
});

// -- SEARCH --
function swapStations() {
    const f = document.getElementById('fromInput');
    const t = document.getElementById('toInput');
    const tmp = f.value;
    f.value = t.value;
    t.value = tmp;
}

async function doSearch() {
    const from = document.getElementById('fromInput').value.trim();
    const to = document.getElementById('toInput').value.trim();
    const token = getToken();

    if (!token) {
        showToast('Please login first!');
        window.location.href = 'irctc-auth.html';
        return;
    }

    if (!from || !to || from === to) {
        showToast('Please select valid stations!');
        return;
    }

    try {
        const res = await fetch(BASE_URL + '/trains/all', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const allTrains = await res.json();

        const filtered = allTrains.filter(function(t) {
            return t.source.toLowerCase().includes(from.toLowerCase()) &&
                t.destination.toLowerCase().includes(to.toLowerCase());
        });

        if (filtered.length > 0) {
            renderTrains(filtered);
            showScreen('scrTrains');
            showToast('Found ' + filtered.length + ' trains from ' + from + ' to ' + to);
        } else {
            showToast('No trains found for this route');
            showScreen('scrTrains');
        }
    } catch (err) {
        showToast('Error fetching trains');
        showScreen('scrTrains');
    }
}

function renderTrains(trains) {
    const container = document.getElementById('scrTrains');
    container.querySelectorAll('.train-card').forEach(function(c) { c.remove(); });

    const badge = container.querySelector('.found-badge');
    if (badge) badge.textContent = trains.length + ' found';

    const continueBtn = container.querySelector('.continue-btn');
    const continueDiv = continueBtn ? continueBtn.parentElement : null;

    trains.forEach(function(train, i) {
        const card = document.createElement('div');
        card.className = 'train-card' + (i === 0 ? ' selected' : '');
        card.id = 'tc' + (i + 1);
        card.setAttribute('data-train-id', train.id);
        card.onclick = function() { selectTrain(i + 1); };
        card.innerHTML =
            '<div class="tc-top">' +
            '<div class="tc-info">' +
            '<div class="tc-icon">&#x1F684;</div>' +
            '<div>' +
            '<div class="tc-num">#' + train.train_number + ' <span class="tc-selected-tag">SELECTED</span></div>' +
            '<div class="tc-name">' + train.train_name + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="tatkal-tag">&#x1F3F7;&#xFE0F; TATKAL: ' + train.available_seats + ' seats</div>' +
            '</div>' +
            '<div class="tc-route">' +
            '<div>' +
            '<div class="tc-time">' + train.departure_time + '</div>' +
            '<div class="tc-station">&#x1F4CD; ' + train.source + '</div>' +
            '</div>' +
            '<div class="tc-line">' +
            '<div class="tc-dots"><div class="tc-dot s"></div><div class="tc-seg"></div><div class="tc-dot e"></div></div>' +
            '<div class="tc-meta"><span>Express</span></div>' +
            '</div>' +
            '<div style="text-align:right">' +
            '<div class="tc-time">' + train.arrival_time + '</div>' +
            '<div class="tc-station">&#x1F4CD; ' + train.destination + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="tc-footer">' +
            '<div class="tc-seats">&#x1F465; <strong>' + train.available_seats + ' tatkal seats left</strong></div>' +
            '<div class="tc-price"><div class="tc-price-new">&#x20B9;' + train.price + ' <span class="tc-price-tag">(+tatkal charge)</span></div></div>' +
            '</div>';

        if (continueDiv) {
            container.insertBefore(card, continueDiv);
        } else {
            container.appendChild(card);
        }
    });
}

function selectTrain(n) {
    document.querySelectorAll('.train-card').forEach(function(c, i) {
        c.classList.toggle('selected', i === n - 1);
    });
}

function showDashboard() { showScreen('scrDash'); }

// -- TATKAL COUNTDOWN --
function startTatkalCountdown() {
    if (tatkalLive) return;
    tatkalCountdown = 15;
    updateCountdownUI(tatkalCountdown);
    setStatusClosed();
    tatkalInterval = setInterval(function() {
        tatkalCountdown--;
        updateCountdownUI(tatkalCountdown);
        queueDepth = Math.min(queueDepth + Math.floor(Math.random() * 40 + 20), 2400);
        const qEl = document.getElementById('syslogQNum');
        if (qEl) qEl.textContent = queueDepth.toLocaleString();
        if (tatkalCountdown <= 0) {
            clearInterval(tatkalInterval);
            goLive();
        }
    }, 1000);
}

function updateCountdownUI(secs) {
    document.getElementById('cd-h').textContent = String(Math.floor(secs / 3600)).padStart(2, '0');
    document.getElementById('cd-m').textContent = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    document.getElementById('cd-s').textContent = String(secs % 60).padStart(2, '0');
}

function setStatusClosed() {
    const cd = document.querySelector('.countdown');
    const tb = document.querySelector('.timer-bar');
    if (cd) {
        cd.classList.remove('live');
        cd.classList.add('waiting');
    }
    if (tb) {
        tb.classList.remove('live');
        tb.classList.add('waiting');
    }
    document.getElementById('tatkalBadge').className = 'tb-closed';
    document.getElementById('tatkalBadge').textContent = 'BOOKING CLOSED';
    document.getElementById('openMsg').innerHTML = 'Tatkal booking opens at <strong>10:00 PM</strong>';
    const btn = document.getElementById('bookBtn');
    btn.disabled = true;
    btn.textContent = 'Booking Not Open Yet';
}

function goLive() {
    tatkalLive = true;
    const cd = document.querySelector('.countdown');
    const tb = document.querySelector('.timer-bar');
    updateCountdownUI(0);
    if (cd) {
        cd.classList.remove('waiting');
        cd.classList.add('live');
    }
    if (tb) {
        tb.classList.remove('waiting');
        tb.classList.add('live');
    }
    document.getElementById('tatkalBadge').className = 'tb-open';
    document.getElementById('tatkalBadge').textContent = 'BOOKING OPEN';
    document.getElementById('openMsg').innerHTML = 'Tatkal Booking is now <strong>OPEN!</strong>';
    const seatBox = document.getElementById('seatSelectorBox');
    if (seatBox) seatBox.classList.add('visible');
    const strip = document.getElementById('confirmedStrip');
    if (strip) strip.innerHTML = '<span style="font-size:18px">&#x26A1;</span><div><strong>Select your preferences</strong> and click Book Ticket to proceed.</div>';
    const btn = document.getElementById('bookBtn');
    btn.disabled = false;
    btn.textContent = 'Book Ticket';
    showToast('Tatkal booking is now LIVE at 10:00 PM!');
    const intBadge = document.getElementById('intBadge');
    if (intBadge) {
        intBadge.textContent = 'LIVE';
        intBadge.style.color = '#4ade80';
    }
    sysLog('info', 'QUEUE', 'Tatkal window opened - 10:00:00 PM');
    sysLog('warn', 'QUEUE', 'Queue depth: ' + queueDepth.toLocaleString() + ' concurrent requests');
    sysLog('lock', 'LOCK', 'Inventory lock initialised - atomic DECR enabled');
    sysLog('info', 'GATE', 'Gate opened. Inventory = 40. Floor enforced.');
    startSimActivity();
}

function resetTimer() {
    clearInterval(tatkalInterval);
    clearInterval(simInterval);
    tatkalLive = false;
    userBooked = false;
    simIndex = 0;
    extraIndex = 0;
    activityItems = [];
    queueDepth = 847;
    renderActivityList();
    updateActivityStats();
    const qEl = document.getElementById('syslogQNum');
    if (qEl) qEl.textContent = '-';
    const intBadge = document.getElementById('intBadge');
    if (intBadge) {
        intBadge.textContent = 'WAITING';
        intBadge.style.color = '#fbbf24';
    }
    const intLog = document.getElementById('intLog');
    if (intLog) intLog.innerHTML = '<div class="il-row"><span class="il-ts">--:--:--</span><span class="il-tag info">INFO</span><span class="il-msg">System ready - waiting for booking window</span></div>';
    const syslogBody = document.getElementById('syslogBody');
    if (syslogBody) syslogBody.innerHTML = '<div class="sl-row"><span class="sl-ts">--:--:--</span><span class="sl-tag info">INIT</span><span class="sl-msg">System ready - waiting for booking window</span></div>';
    const seatBox = document.getElementById('seatSelectorBox');
    if (seatBox) {
        seatBox.classList.remove('visible');
        seatBox.style.opacity = '';
        seatBox.style.pointerEvents = '';
    }
    const soldout = document.getElementById('soldoutMsg');
    if (soldout) soldout.style.display = 'none';
    const strip = document.getElementById('confirmedStrip');
    if (strip) strip.innerHTML = '<span style="font-size:18px">&#x2139;&#xFE0F;</span><div><strong>Booking Not Started</strong> Tatkal opens at 10:00 PM. Be ready!</div>';
    const btn = document.getElementById('bookBtn');
    btn.style.background = '';
    startTatkalCountdown();
}

// -- INTERNALS LOG --
function intLog(tag, msg) {
    const el = document.getElementById('intLog');
    if (!el) return;
    const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tagClass = { 'ok': 'ok', 'err': 'err', 'warn': 'warn', 'info': 'info', 'lock': 'lock' }[tag] || 'info';
    const row = document.createElement('div');
    row.className = 'il-row';
    row.innerHTML = '<span class="il-ts">' + ts + '</span><span class="il-tag ' + tagClass + '">' + tag.toUpperCase() + '</span><span class="il-msg">' + msg + '</span>';
    el.insertBefore(row, el.firstChild);
    if (el.children.length > 30) el.removeChild(el.lastChild);
}

// -- SYSTEM LOG --
function sysLog(tag, label, msg) {
    const el = document.getElementById('syslogBody');
    if (!el) return;
    const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const row = document.createElement('div');
    row.className = 'sl-row';
    row.innerHTML = '<span class="sl-ts">' + ts + '</span><span class="sl-tag ' + tag + '">' + label + '</span><span class="sl-msg">' + msg + '</span>';
    el.insertBefore(row, el.firstChild);
    if (el.children.length > 50) el.removeChild(el.lastChild);
    if (queueDepth > 0) {
        queueDepth = Math.max(0, queueDepth - Math.floor(Math.random() * 8 + 2));
        const qEl = document.getElementById('syslogQNum');
        if (qEl) qEl.textContent = queueDepth.toLocaleString();
    }
}

// -- ACTIVITY FEED --
const EXTRA_PEOPLE = [
    { name: 'Vikram Nair', pnr: null, seat: null, status: 'sold' },
    { name: 'Anita Desai', pnr: '71829304', seat: 'A2/6', status: 'conf' },
    { name: 'Suresh Kumar', pnr: null, seat: null, status: 'wait' },
    { name: 'Pooja Singh', pnr: '82047193', seat: 'B3/11', status: 'conf' },
    { name: 'Rajan Iyer', pnr: null, seat: null, status: 'sold' },
    { name: 'Meera Pillai', pnr: '93048571', seat: 'S3/4', status: 'conf' },
    { name: 'Deepak Sharma', pnr: null, seat: null, status: 'wait' },
    { name: 'Arun Kumar', pnr: null, seat: null, status: 'sold' },
    { name: 'Nisha Reddy', pnr: '64829034', seat: 'A1/7', status: 'conf' },
    { name: 'Ramesh Patil', pnr: null, seat: null, status: 'sold' },
];
let extraIndex = 0;

function startSimActivity() {
    simIndex = 0;
    extraIndex = 0;
    activityItems = [];
    renderActivityList();
    simInterval = setInterval(addSimPerson, 1200);
}

function addSimPerson() {
    if (simIndex < SIM_PEOPLE.length) {
        pushActivityItem(SIM_PEOPLE[simIndex++]);
    } else {
        clearInterval(simInterval);
        simInterval = setInterval(addExtraPerson, 2500);
    }
}

function addExtraPerson() {
    const conf = activityItems.filter(function(i) { return i.status === 'conf'; }).length;
    const seatsLeft = Math.max(0, 40 - conf);
    let p;
    if (seatsLeft === 0) {
        p = Object.assign({}, EXTRA_PEOPLE[extraIndex % EXTRA_PEOPLE.length], { pnr: null, seat: null, status: Math.random() < 0.7 ? 'sold' : 'wait' });
    } else {
        p = EXTRA_PEOPLE[extraIndex % EXTRA_PEOPLE.length];
    }
    extraIndex++;
    pushActivityItem(p);
}

function pushActivityItem(p) {
    const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    activityItems.unshift(Object.assign({}, p, { time: ts }));
    updateActivityStats();
    renderActivityList();
    const threadId = Math.floor(Math.random() * 9000 + 1000);
    if (p.status === 'conf') {
        const inv = 40 - activityItems.filter(function(i) { return i.status === 'conf'; }).length;
        intLog('lock', 'Thread #' + threadId + ' acquired lock');
        intLog('ok', 'ATOMIC DECR - ' + inv + ' [' + p.name + ' CONFIRMED PNR:' + p.pnr + ']');
        intLog('info', 'Thread #' + threadId + ' released lock');
        sysLog('lock', 'LOCK', 'Thread #' + threadId + ' acquired inventory lock');
        sysLog('ok', 'DECR', 'Inventory: ' + (inv + 1) + ' -> ' + inv + ' - ' + p.name + ' confirmed');
        sysLog('info', 'LOCK', 'Thread #' + threadId + ' released');
    } else if (p.status === 'sold') {
        intLog('warn', 'Thread #' + threadId + ' CHECK: inventory = 0');
        intLog('err', 'REJECT - ' + p.name + ' gate floor enforced');
        sysLog('warn', 'GATE', 'Thread #' + threadId + ' inventory = 0 at check');
        sysLog('err', 'DENY', p.name + ' rejected - no inventory');
    } else {
        intLog('warn', 'Thread #' + threadId + ' inventory low, waitlisted: ' + p.name);
        sysLog('warn', 'WAIT', p.name + ' waitlisted - inventory exhausted');
    }
}

// -- SEAT CHIP SELECTION --
function selectChip(groupId, btn, val) {
    document.querySelectorAll('#' + groupId + ' .ssp-chip').forEach(function(c) { c.classList.remove('active'); });
    btn.classList.add('active');
    updateSeatSummary();
}

function updateSeatSummary() {
    const clsEl = document.querySelector('#chipClass .ssp-chip.active');
    const berthEl = document.querySelector('#chipBerth .ssp-chip.active');
    const quotaEl = document.querySelector('#chipQuota .ssp-chip.active');
    const cls = clsEl ? clsEl.textContent.split('-')[0].trim() : '3A';
    const berth = berthEl ? berthEl.textContent : 'Lower';
    const quota = quotaEl ? quotaEl.textContent.split('(')[0].trim() : 'Tatkal';
    const summaryEl = document.getElementById('seatSummaryText');
    if (summaryEl) summaryEl.textContent = cls + ' - ' + berth + ' - ' + quota;
}

function addUserToActivity() {
    const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clsEl = document.querySelector('#chipClass .ssp-chip.active');
    const berthEl = document.querySelector('#chipBerth .ssp-chip.active');
    const cls = clsEl ? clsEl.textContent.split('-')[0].trim() : '3A';
    const berth = berthEl ? berthEl.textContent : 'LB';
    const userData = getUser();
    const nameField = document.getElementById('passengerName');
    const passenger = (nameField && nameField.value) ? nameField.value : (userData ? userData.full_name : 'Passenger');
    activityItems.unshift({ name: 'You (' + passenger + ')', pnr: '10943763', seat: 'B2/' + berth.split(' ')[0], status: 'conf', time: ts, isMe: true });
    updateActivityStats();
    renderActivityList();
    const inv = 40 - activityItems.filter(function(i) { return i.status === 'conf'; }).length;
    intLog('lock', 'Thread #YOU acquired lock');
    intLog('ok', 'ATOMIC DECR - ' + inv + ' [YOU CONFIRMED PNR:10943763 ' + cls + ' ' + berth + ']');
    intLog('info', 'Thread #YOU released lock');
    sysLog('lock', 'LOCK', 'Thread #YOU acquired inventory lock');
    sysLog('ok', 'DECR', 'Inventory: ' + (inv + 1) + ' -> ' + inv + ' - ' + passenger + ' confirmed');
    sysLog('info', 'LOCK', 'Thread #YOU released');
}

function updateActivityStats() {
    const conf = activityItems.filter(function(i) { return i.status === 'conf'; }).length;
    const sold = activityItems.filter(function(i) { return i.status === 'sold'; }).length;
    const wait = activityItems.filter(function(i) { return i.status === 'wait'; }).length;
    document.getElementById('statConf').textContent = conf;
    document.getElementById('statSold').textContent = sold;
    document.getElementById('statWait').textContent = wait;
    document.getElementById('attemptsBadge').textContent = activityItems.length + ' attempts';
    const seatsLeft = Math.max(0, 40 - conf);
    document.getElementById('seatCount').textContent = seatsLeft;
    document.getElementById('availText').textContent = seatsLeft + '/40 seats';
    document.getElementById('availFill').style.width = ((seatsLeft / 40) * 100) + '%';
    if (seatsLeft <= 5 && seatsLeft > 0) sysLog('warn', 'INV', 'Only ' + seatsLeft + ' seats remaining!');
    if (seatsLeft === 0) {
        const btn = document.getElementById('bookBtn');
        if (!userBooked) {
            btn.disabled = true;
            btn.textContent = 'All Seats Sold Out';
            btn.style.background = '#94a3b8';
        }
        const soldout = document.getElementById('soldoutMsg');
        if (soldout) soldout.style.display = 'block';
        const seatBox = document.getElementById('seatSelectorBox');
        if (seatBox) {
            seatBox.style.opacity = '0.5';
            seatBox.style.pointerEvents = 'none';
        }
        sysLog('err', 'GATE', 'Inventory = 0. Gate CLOSED. All further requests rejected.');
    }
}

function renderActivityList() {
    const list = document.getElementById('activityList');
    if (activityItems.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:30px 0;color:var(--muted);font-size:13px;">Waiting for booking to open at 10:00 PM...</div>';
        return;
    }
    list.innerHTML = activityItems.slice(0, 8).map(function(item) {
        const icon = item.status === 'conf' ? '&#x2705;' : item.status === 'sold' ? '&#x274C;' : '&#x23F3;';
        const badge = item.status === 'conf' ? 'Ticket Confirmed' : item.status === 'sold' ? 'Sold Out' : 'Waitlisted';
        const meta = '<span>' + item.time + '</span>' + (item.pnr ? '<span>PNR: ' + item.pnr + '</span>' : '') + (item.seat ? '<span>Seat: ' + item.seat + '</span>' : '');
        return '<div class="act-item ' + item.status + (item.isMe ? ' highlight-me' : '') + '"><div class="ai-icon">' + icon + '</div><div class="ai-body"><div class="ai-name">' + item.name + '</div><div class="ai-meta">' + meta + '</div></div><div class="ai-badge">' + badge + '</div></div>';
    }).join('');
}

// -- PAYMENT --
let currentPayMethod = 'upi';
let selectedBank = 'SBI';
let selectedWallet = 'Paytm Wallet';
let upiVerified = false;

function openPayment() {
    if (!tatkalLive) { showToast('Booking not open yet!'); return; }
    const userData = getUser();
    const nameField = document.getElementById('passengerName');
    const passenger = (nameField && nameField.value) ? nameField.value : (userData ? userData.full_name : 'Passenger');
    const clsEl = document.querySelector('#chipClass .ssp-chip.active');
    const berthEl = document.querySelector('#chipBerth .ssp-chip.active');
    const insEl = document.getElementById('insuranceToggle');
    const clsFull = clsEl ? clsEl.textContent : '3A - AC 3 Tier';
    const berth = berthEl ? berthEl.textContent : 'Lower Berth';
    const ins = insEl ? insEl.checked : false;

    const payPassenger = document.getElementById('pay-passenger');
    const payClass = document.getElementById('pay-class');
    const payBerth = document.getElementById('pay-berth');
    const payTotalSub = document.getElementById('pay-total-sub');
    const payTotalPrice = document.getElementById('pay-total-price');

    if (payPassenger) payPassenger.textContent = passenger;
    if (payClass) payClass.textContent = clsFull;
    if (payBerth) payBerth.textContent = berth;
    if (payTotalSub) payTotalSub.textContent = ins ? 'incl. Rs.400 tatkal + Rs.0.45 insurance' : 'incl. Rs.400 tatkal charge';
    if (payTotalPrice) payTotalPrice.textContent = '₹1,805';
    document.getElementById('payOverlay').classList.add('show');
    seatSecs = 30;
    updateSeatTimer(seatSecs);
    clearInterval(seatInterval);
    seatInterval = setInterval(function() {
        seatSecs = Math.max(0, seatSecs - 1);
        updateSeatTimer(seatSecs);
        if (seatSecs === 0) clearInterval(seatInterval);
    }, 1000);
    sysLog('info', 'PAY', 'Payment window opened - seat held for 30s');

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js').then(function() {
        const wrap = document.getElementById('upiQrWrap');
        if (!wrap) return;
        wrap.innerHTML = '';
        const upiString = 'upi://pay?pa=irctc@sbi&pn=IRCTC+Tatkal&am=1805.00&tn=PNR10943763&cu=INR';
        try {
            new QRCode(wrap, { text: upiString, width: 128, height: 128, colorDark: '#1e3a8a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
        } catch (e) { drawFallbackQr(wrap); }
    }).catch(function() {
        const wrap = document.getElementById('upiQrWrap');
        if (wrap) drawFallbackQr(wrap);
    });
}

function updateSeatTimer(s) {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    document.getElementById('seatTimerEl').textContent = '00:' + m + ':' + sec;
    document.getElementById('stFill').style.width = ((s / 30) * 100) + '%';
}

function closePayment() {
    document.getElementById('payOverlay').classList.remove('show');
    clearInterval(seatInterval);
    sysLog('warn', 'PAY', 'Payment window closed - seat released');
}

function setPayMethod(el, method) {
    currentPayMethod = method;
    document.querySelectorAll('.pm-btn').forEach(function(b) { b.classList.remove('active'); });
    el.classList.add('active');
    ['Upi', 'Card', 'Nb', 'Wallet'].forEach(function(m) {
        const p = document.getElementById('panel' + m);
        if (p) p.style.display = m.toLowerCase() === method ? 'block' : 'none';
    });
}

function drawFallbackQr(container) {
    container.innerHTML = '<div style="width:128px;height:128px;background:#1e3a8a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:40px;">&#x25A6;</div>';
}

function liveUpiHint(val) {
    const hint = document.getElementById('upiIdHint');
    const field = document.getElementById('upiIdInput');
    const reqBox = document.getElementById('upiRequestInfo');
    if (reqBox) reqBox.style.display = 'none';
    upiVerified = false;
    if (field) field.classList.remove('ok', 'err');
    if (!hint) return;
    if (!val) {
        hint.className = 'upi-id-hint';
        hint.textContent = '';
        return;
    }
    if (val.length > 3 && !val.includes('@')) {
        hint.className = 'upi-id-hint info';
        hint.innerHTML = 'Add @bankname - e.g. name@okaxis, name@ybl, name@upi';
    } else if (val.includes('@') && val.split('@')[1]) {
        hint.className = 'upi-id-hint ok';
        hint.innerHTML = 'Looks good - click Send Request';
    } else {
        hint.className = 'upi-id-hint';
        hint.textContent = '';
    }
}

function verifyUpiId() {
    const input = document.getElementById('upiIdInput');
    const val = input.value.trim();
    const hint = document.getElementById('upiIdHint');
    const reqBox = document.getElementById('upiRequestInfo');
    const btn = document.getElementById('upiSendBtn');
    const txt = document.getElementById('upiSendTxt');
    if (!val) {
        hint.className = 'upi-id-hint err';
        hint.textContent = 'Enter a UPI ID first';
        return;
    }
    if (!/^[\w.\-]+@[\w]+$/.test(val)) {
        hint.className = 'upi-id-hint err';
        hint.textContent = 'Invalid format - try name@okaxis or name@ybl';
        input.classList.add('err');
        upiVerified = false;
        return;
    }
    btn.disabled = true;
    txt.textContent = 'Sending...';
    hint.className = 'upi-id-hint info';
    hint.innerHTML = 'Sending payment request to ' + val + '...';
    input.classList.remove('ok', 'err');
    setTimeout(function() {
        btn.disabled = false;
        txt.textContent = 'Sent';
        hint.className = 'upi-id-hint ok';
        hint.innerHTML = 'Request sent! Waiting for approval on their phone...';
        input.classList.add('ok');
        const target = document.getElementById('upiRequestTarget');
        if (target) target.textContent = val;
        if (reqBox) reqBox.style.display = 'flex';
        upiVerified = true;
        setTimeout(function() { txt.textContent = 'Send Request'; }, 3000);
    }, 1200);
}

function openUpiApp(app) {
    const upiString = 'upi://pay?pa=irctc@sbi&pn=IRCTC+Tatkal&am=1805.00&tn=PNR10943763&cu=INR';
    window.location.href = upiString;
    const appName = app === 'gpay' ? 'Google Pay' : app === 'phonepe' ? 'PhonePe' : 'Paytm';
    setTimeout(function() { showToast('Opening ' + appName + '...'); }, 200);
}

function formatCardNumber(inp) {
    let v = inp.value.replace(/\D/g, '').slice(0, 16);
    inp.value = v.replace(/(\d{4})(?=\d)/g, '$1  ');
}

function formatExpiry(inp) {
    let v = inp.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    inp.value = v;
}

function selectBank(el, name) {
    document.querySelectorAll('.nb-bank').forEach(function(b) { b.classList.remove('active'); });
    el.classList.add('active');
    selectedBank = name;
    const nbName = document.getElementById('nbBankName');
    if (nbName) nbName.textContent = name;
}

const WALLET_BALANCES = { 'Paytm Wallet': 2340, 'Amazon Pay': 450, 'Mobikwik': 0, 'Freecharge': 120 };

function selectWallet(el, name) {
    document.querySelectorAll('.wallet-btn').forEach(function(b) { b.classList.remove('active'); });
    el.classList.add('active');
    selectedWallet = name;
    const bal = WALLET_BALANCES[name] || 0;
    const after = Math.max(0, bal - 1805);
    const wName = document.getElementById('walletName');
    const wAfter = document.getElementById('walletAfter');
    const note = document.getElementById('walletNote');
    if (wName) wName.textContent = name;
    if (wAfter) wAfter.textContent = 'Rs.' + after.toLocaleString();
    if (note) {
        if (bal < 1805) {
            note.style.background = '#fef2f2';
            note.style.borderColor = '#fecaca';
            note.style.color = 'var(--red)';
            note.innerHTML = 'Insufficient balance in ' + name + ' (Rs.' + bal + '). Please add money or choose another method.';
        } else {
            note.style.background = '';
            note.style.borderColor = '';
            note.style.color = '';
            note.innerHTML = 'Paying Rs.1,805 from ' + name + '. Balance after payment: Rs.' + after.toLocaleString();
        }
    }
}

// -- PROCESS PAYMENT --
function processPayment() {
    if (currentPayMethod === 'upi') {
        const id = document.getElementById('upiIdInput');
        if (id && id.value.trim() && !upiVerified) { showToast('Please verify your UPI ID first'); return; }
    }
    if (currentPayMethod === 'card') {
        const num = document.getElementById('cardNumber');
        const name = document.getElementById('cardName');
        const exp = document.getElementById('cardExpiry');
        const cvv = document.getElementById('cardCvv');
        const hint = document.getElementById('cardHint');
        if (num && num.value.replace(/\s/g, '').length < 16) { if (hint) hint.textContent = 'Enter a valid 16-digit card number'; return; }
        if (name && !name.value.trim()) { if (hint) hint.textContent = 'Enter name on card'; return; }
        if (exp && exp.value.length < 5) { if (hint) hint.textContent = 'Enter expiry date (MM/YY)'; return; }
        if (cvv && cvv.value.length < 3) { if (hint) hint.textContent = 'Enter 3-digit CVV'; return; }
        if (hint) hint.textContent = '';
    }
    if (currentPayMethod === 'nb') {
        const uid = document.getElementById('nbUserId');
        const pwd = document.getElementById('nbPassword');
        if (!uid || !uid.value.trim() || !pwd || !pwd.value) { showToast('Enter your net banking credentials'); return; }
    }
    if (currentPayMethod === 'wallet') {
        const bal = WALLET_BALANCES[selectedWallet] || 0;
        if (bal < 1805) { showToast('Insufficient balance in ' + selectedWallet); return; }
    }

    document.getElementById('payOverlay').classList.remove('show');
    clearInterval(seatInterval);
    const overlay = document.getElementById('processingOverlay');
    overlay.classList.add('show');

    const methodLabels = { 'upi': 'UPI Payment', 'card': 'Card Payment', 'nb': selectedBank + ' NetBanking', 'wallet': selectedWallet };
    const procTitle = document.getElementById('procTitle');
    if (procTitle) procTitle.textContent = 'Processing ' + methodLabels[currentPayMethod] + '...';

    const steps = [
        { label: 'Connecting to payment gateway...', delay: 0 },
        { label: 'Authenticating credentials...', delay: 900 },
        { label: 'Debiting amount Rs.1,805...', delay: 1900 },
        { label: 'Generating PNR & ticket...', delay: 2800 },
        { label: 'Booking confirmed', delay: 3600 },
    ];
    const stepsEl = document.getElementById('procSteps');
    if (stepsEl) stepsEl.innerHTML = steps.map(function(s, i) { return '<div class="proc-step pending" id="ps' + i + '">' + s.label + '</div>'; }).join('');

    steps.forEach(function(s, i) {
        setTimeout(function() {
            const prev = document.getElementById('ps' + (i - 1));
            const curr = document.getElementById('ps' + i);
            if (prev) prev.className = 'proc-step done';
            if (curr) {
                curr.className = 'proc-step active';
                curr.innerHTML = '&#x25B6; ' + s.label;
            }
        }, s.delay);
    });

    setTimeout(async function() {
        try {
            const token = getToken();
            const selectedCard = document.querySelector('.train-card.selected');
            const trainId = selectedCard ? parseInt(selectedCard.getAttribute('data-train-id') || selectedCard.id.replace('tc', '')) : 1;

            const res = await fetch(BASE_URL + '/bookings/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ train_id: trainId })
            });
            const data = await res.json();

            overlay.classList.remove('show');

            if (data.booking_id) {
                populateTicket();
                addUserToActivity();
                userBooked = true;
                showScreen('scrTicket');
                showToast('Ticket Confirmed! Booking ID: ' + data.booking_id);
            } else {
                showScreen('scrDash');
                showToast('Booking failed: ' + (data.error || 'Try again'));
            }
        } catch (err) {
            overlay.classList.remove('show');
            showToast('Server error. Is backend running?');
        }
    }, 4200);
}

function completePayment() { processPayment(); }

// -- POPULATE TICKET --
function populateTicket() {
    const userData = getUser();
    const nameField = document.getElementById('passengerName');
    const passenger = (nameField && nameField.value) ? nameField.value : (userData ? userData.full_name : 'Passenger');

    const clsEl = document.querySelector('#chipClass .ssp-chip.active');
    const berthEl = document.querySelector('#chipBerth .ssp-chip.active');
    const quotaEl = document.querySelector('#chipQuota .ssp-chip.active');
    const boardingEl = document.getElementById('boardingStation');
    const insEl = document.getElementById('insuranceToggle');

    const clsFull = clsEl ? clsEl.textContent : '3A - AC 3 Tier';
    const berth = berthEl ? berthEl.textContent : 'LB Lower';
    const quota = quotaEl ? quotaEl.textContent.replace(/\s*\(.*\)/, '').trim() : 'Tatkal';
    const boardingTxt = boardingEl ? boardingEl.options[boardingEl.selectedIndex].text : 'Mumbai Central (BCT)';
    const ins = insEl ? insEl.checked : false;
    const berthCode = berth.split(' ')[0];
    const seatMap = { 'LB': '3', 'MB': '33', 'UB': '63', 'SL': '73', 'SU': '71' };
    const seatNum = seatMap[berthCode] || '3';

    const set = function(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setHTML = function(id, val) { const el = document.getElementById(id); if (el) el.innerHTML = val; };

    set('tkt-name', passenger);
    set('tkt-seat', 'B2 - ' + seatNum);
    set('tkt-berth', berth);
    set('tkt-class', clsFull.split('-')[0].trim());
    set('tkt-class2', clsFull);
    set('tkt-quota', quota.toUpperCase());
    setHTML('tkt-boarding', '&#x1F4CD; ' + boardingTxt.split('(')[0].trim());

    const insRow = document.getElementById('tkt-insurance-row');
    const insFareRow = document.getElementById('tkt-ins-fare-row');
    if (ins) {
        set('tkt-insurance', 'Covered (Rs.0.45)');
        if (insRow) insRow.style.display = '';
        if (insFareRow) insFareRow.style.display = '';
    } else {
        if (insRow) insRow.style.display = 'none';
        if (insFareRow) insFareRow.style.display = 'none';
    }
    set('tkt-total', 'Rs.1,805');

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js').then(function() {
        const box = document.getElementById('stationQrBox');
        if (!box) return;
        box.innerHTML = '';
        box.style.width = '70px';
        box.style.height = '70px';
        try {
            new QRCode(box, { text: 'PNR:10943763|' + passenger + '|B2-' + seatNum + '|Mumbai-Delhi', width: 66, height: 66, colorDark: '#1e3a8a', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.M });
        } catch (e) {}
    }).catch(function() {});
}

// -- INTERNALS PANEL TOGGLE --
function toggleInternals() {
    const body = document.getElementById('intBody');
    const arrow = document.getElementById('intArrow');
    if (!body || !arrow) return;
    const open = body.classList.toggle('open');
    arrow.textContent = open ? 'collapse' : 'expand';
}

// -- RACE CONDITION SIMULATOR --
function runRace() {
    const btn = document.getElementById('raceBtnEl');
    btn.disabled = true;
    btn.textContent = 'Running...';
    document.querySelectorAll('.rs').forEach(function(el) { el.classList.remove('vis', 'bad-end', 'good-end'); });
    const badSteps = document.querySelectorAll('.rs-bad');
    const goodSteps = document.querySelectorAll('.rs-good');
    const delays = [0, 500, 900, 1400, 1800, 2200];
    badSteps.forEach(function(el, i) {
        setTimeout(function() {
            el.classList.add('vis');
            if (i === badSteps.length - 1) el.classList.add('bad-end');
            if (i === 2) el.classList.add('hl');
        }, delays[i]);
    });
    const goodDelays = [200, 700, 1000, 1400, 1900, 2300, 2700];
    goodSteps.forEach(function(el, i) {
        setTimeout(function() {
            el.classList.add('vis');
            if (i === goodSteps.length - 1) el.classList.add('good-end');
        }, goodDelays[i]);
    });
    setTimeout(function() {
        btn.disabled = false;
        btn.textContent = 'Run again';
    }, 3200);
}

// -- PDF DOWNLOAD --
function downloadTicketPDF() {
    const btn = event.currentTarget;
    const orig = btn.innerHTML;
    btn.innerHTML = 'Generating PDF...';
    btn.disabled = true;
    Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    ]).then(function() {
        const el = document.querySelector('#printTicket .ticket-card');
        html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(function(canvas) {
            const jsPDF = window.jspdf.jsPDF;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
            const pw = pdf.internal.pageSize.getWidth(),
                ph = pdf.internal.pageSize.getHeight();
            pdf.setFillColor(30, 58, 138);
            pdf.rect(0, 0, pw, 14, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('IRCTC TATKAL TICKET', pw / 2, 9, { align: 'center' });
            const imgData = canvas.toDataURL('image/png');
            const imgH = (canvas.height / canvas.width) * (pw - 20);
            pdf.addImage(imgData, 'PNG', 10, 18, pw - 20, imgH);
            pdf.setFillColor(241, 245, 249);
            pdf.rect(0, ph - 10, pw, 10, 'F');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Simulated ticket - demo purposes only. Not valid for actual travel.', pw / 2, ph - 4, { align: 'center' });
            pdf.save('IRCTC_Tatkal_Ticket.pdf');
            btn.innerHTML = 'Downloaded!';
            setTimeout(function() {
                btn.innerHTML = orig;
                btn.disabled = false;
            }, 2500);
        });
    }).catch(function() {
        window.print();
        btn.innerHTML = orig;
        btn.disabled = false;
    });
}

function loadScript(src) {
    return new Promise(function(res, rej) {
        if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
    });
}

// -- WHATSAPP SHARE --
function shareWhatsApp() {
    const userData = getUser();
    const name = userData ? userData.full_name : 'Passenger';
    const msg = encodeURIComponent('IRCTC Tatkal Ticket Confirmed!\n\nPassenger: ' + name + '\nTrain: Mumbai Rajdhani Express (#12951)\nRoute: Mumbai Central to New Delhi\nPNR: 10943763\nFare: Rs.1,805 (TATKAL)\n\nBooked via IRCTC Tatkal Simulator');
    window.open('https://wa.me/?text=' + msg, '_blank');
}

// -- LOAD MY BOOKINGS --
async function loadMyBookings() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(BASE_URL + '/bookings/my', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const bookings = await res.json();

        const container = document.getElementById('scrBookings');
        container.querySelectorAll('.booking-item').forEach(function(i) { i.remove(); });

        const countEl = container.querySelector('.bookings-count');
        if (countEl) countEl.textContent = bookings.length + ' bookings';

        if (!bookings.length) {
            const empty = document.createElement('div');
            empty.style.cssText = 'text-align:center;padding:40px;color:#888;';
            empty.textContent = 'No bookings yet';
            container.appendChild(empty);
            return;
        }

        bookings.forEach(function(b) {
            const item = document.createElement('div');
            item.className = 'booking-item';
            item.innerHTML =
                '<div class="bi-header">' +
                '<div>' +
                '<div class="bi-train-name">' + b.train_name + '</div>' +
                '<div class="bi-train-num">#' + (b.train_number || '') + '</div>' +
                '</div>' +
                '<div class="bi-status confirmed">Confirmed</div>' +
                '</div>' +
                '<div class="bi-body">' +
                '<div><div class="bi-field-lbl">From</div><div class="bi-field-val">' + b.source + '</div></div>' +
                '<div><div class="bi-field-lbl">To</div><div class="bi-field-val">' + b.destination + '</div></div>' +
                '<div><div class="bi-field-lbl">Travel Date</div><div class="bi-field-val">' + new Date(b.journey_date).toDateString() + '</div></div>' +
                '<div><div class="bi-field-lbl">Seat</div><div class="bi-field-val">Seat ' + b.seat_number + '</div></div>' +
                '</div>' +
                '<div class="bi-footer">' +
                '<div class="bi-pnr">Booking ID: <span>' + b.id + '</span></div>' +
                '<div class="bi-status confirmed">' + b.status + '</div>' +
                '</div>';
            container.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading bookings:', err);
    }
}

// -- AUTO FILL PASSENGER NAME FROM LOGGED IN USER --
window.addEventListener('load', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'irctc-auth.html';
        return;
    }
    const userData = getUser();
    if (userData) {
        const nameField = document.getElementById('passengerName');
        if (nameField && userData.full_name) {
            nameField.value = userData.full_name;
        }
    }
});