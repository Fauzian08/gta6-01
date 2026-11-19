// Isla Azura — the HUD. Every panel the player reads is a DOM element the
// game updates once a frame: the mission tracker, the AZPD response list, the
// money and wanted stars, rank and RP, weapon slots, crew abilities, the
// district card, health and armour, speed and car damage, dialogue and the
// radio. The pause screen (map, story, stats, crew, settings, controls, save)
// is rendered here too, from the live save data.
export class HUD {
  constructor() {
    this.el = {};
    for (const id of [
      'hud', 'mission', 'missionName', 'missionStage', 'missionObjective', 'missionNext',
      'policePanel', 'policeCount', 'policeList', 'policeChatter',
      'clock', 'money', 'stars', 'airUnit', 'rankName', 'rankBar', 'rankRp',
      'weapons', 'crew', 'districtName', 'districtSub', 'districtStanding', 'districtBar',
      'healthBar', 'healthNum', 'armourBar', 'armourNum',
      'speedNum', 'carName', 'carDamage', 'radio',
      'dialogue', 'dialogueWho', 'dialogueLine', 'hint', 'crosshair',
      'screenTitle', 'screenPause', 'screenOver', 'pauseBody', 'pauseTabs',
      'wastedTitle', 'wastedSub', 'titleSlots', 'titleMoney',
    ]) this.el[id] = document.getElementById(id);
    this.pauseTab = 'STATS';
    this.lastDialogue = '';
  }

  starsHtml(n) {
    let s = '';
    for (let i = 0; i < 5; i += 1) s += i < n ? '★' : '☆';
    return s;
  }

  update(s) {
    const el = this.el;
    // Mission tracker
    if (s.mission) {
      el.mission.style.display = 'block';
      el.missionName.textContent = 'MISSION ' + s.mission.id + ' · ' + s.mission.name;
      el.missionStage.textContent = 'STAGE ' + (s.mission.stage + 1) + '/' + s.mission.stages;
      el.missionObjective.textContent = s.mission.objective;
      el.missionNext.textContent = s.mission.next ? 'NEXT  ' + s.mission.next : '';
    } else {
      el.mission.style.display = 'none';
    }
    // AZPD response
    if (s.stars > 0 && s.policeUnits.length) {
      el.policePanel.style.display = 'block';
      el.policeCount.textContent = s.policeUnits.length + ' UNITS';
      el.policeList.innerHTML = s.policeUnits.slice(0, 6).map((u) =>
        '<div class="unit"><span class="unit-name">' + u.name + '</span><span class="unit-role">' + u.role + '</span><span class="unit-dist">' + u.dist + ' m</span></div>',
      ).join('');
      el.policeChatter.textContent = s.chatter || '';
    } else {
      el.policePanel.style.display = 'none';
    }
    // Money, clock, stars
    el.clock.textContent = s.clock;
    el.money.textContent = '$' + s.money.toLocaleString('en-US');
    el.stars.textContent = this.starsHtml(s.stars);
    el.stars.className = 'stars' + (s.stars >= 4 ? ' hot' : '');
    el.airUnit.style.display = s.stars >= 4 ? 'block' : 'none';
    // Rank
    el.rankName.textContent = 'RANK ' + s.rankIndex + ' · ' + s.rankName;
    const pct = Math.max(0, Math.min(100, ((s.rp - s.rpBase) / Math.max(1, s.rpNext - s.rpBase)) * 100));
    el.rankBar.style.width = pct + '%';
    el.rankRp.textContent = s.rp.toLocaleString('en-US') + ' / ' + s.rpNext.toLocaleString('en-US') + ' RP';
    // Weapons
    el.weapons.innerHTML = s.weapons.map((w, i) =>
      '<div class="weapon' + (i === s.weaponIndex ? ' active' : '') + '"><div class="wslot">' + (i + 1) + '</div><div class="wname">' + w.name + '</div><div class="wammo">' + (w.mag === Infinity ? '∞' : w.mag + '/' + w.reserve) + '</div></div>',
    ).join('');
    // Crew abilities
    el.crew.innerHTML = s.crew.map((c) =>
      '<div class="ability' + (c.ready ? '' : ' cooling') + '"><div class="akey">' + c.key + '</div><div><div class="aname">' + c.ability + '</div><div class="arole">' + c.name + ' · ' + c.role + '</div></div></div>',
    ).join('');
    // District
    el.districtName.textContent = s.district.name.toUpperCase();
    el.districtSub.textContent = s.district.sub;
    el.districtStanding.textContent = s.standingLabel;
    el.districtBar.style.width = s.standingValue + '%';
    // Vitals
    el.healthBar.style.width = s.health + '%';
    el.healthNum.textContent = Math.round(s.health);
    el.armourBar.style.width = s.armour + '%';
    el.armourNum.textContent = Math.round(s.armour);
    // Speed / car
    if (s.inCar) {
      el.speedNum.textContent = Math.round(s.speedKmh);
      el.carName.textContent = s.carName;
      el.carDamage.textContent = Math.round(s.carDamage) + '% DENTED';
      el.radio.textContent = '♪ ' + s.radio.station + ' — ' + s.radio.show;
      el.speedNum.parentElement.style.display = 'block';
    } else {
      el.speedNum.parentElement.style.display = 'none';
    }
    // Dialogue
    if (s.dialogue) {
      el.dialogue.style.display = 'flex';
      el.dialogueWho.textContent = s.dialogue.who.toUpperCase();
      el.dialogueLine.textContent = s.dialogue.line;
    } else {
      el.dialogue.style.display = 'none';
    }
    el.hint.textContent = s.hint || '';
    el.crosshair.style.display = s.showCrosshair ? 'block' : 'none';
  }

  showScreen(name) {
    this.el.screenTitle.style.display = name === 'title' ? 'flex' : 'none';
    this.el.screenPause.style.display = name === 'pause' ? 'flex' : 'none';
    this.el.screenOver.style.display = name === 'over' ? 'flex' : 'none';
    this.el.hud.style.display = name === 'play' ? 'block' : 'none';
  }

  setTitleSlots(slots) {
    this.el.titleSlots.innerHTML = slots.map((s, i) =>
      '<div class="slot"><b>SLOT ' + (i + 1) + ' · ' + (s ? s.label : 'EMPTY') + '</b><span>' + (s ? s.detail : 'New game from the start screen') + '</span></div>',
    ).join('');
  }

  renderPause(tab, data) {
    this.pauseTab = tab;
    const tabs = ['MAP', 'STORY', 'STATS', 'CREW', 'SETTINGS', 'CONTROLS', 'SAVE'];
    this.el.pauseTabs.innerHTML = tabs.map((t) =>
      '<button class="ptab' + (t === tab ? ' active' : '') + '" data-tab="' + t + '">' + t + '</button>',
    ).join('');
    const b = this.el.pauseBody;
    if (tab === 'STATS') {
      b.innerHTML =
        '<div class="statcol"><div class="ring"><b>' + data.completePct + '%</b><span>COMPLETE</span></div>' +
        data.progress.map((p) => '<div class="prog"><span>' + p.label + '</span><i style="width:' + p.pct + '%"></i><b>' + p.text + '</b></div>').join('') +
        '</div><div class="statcol wide"><div id="pauseMapWrap"><canvas id="pauseMap" width="640" height="420"></canvas></div>' +
        '<div class="career">' + data.career.map((c) => '<div class="careerItem"><b>' + c.value + '</b><span>' + c.label + '</span></div>').join('') + '</div></div>' +
        '<div class="statcol"><h3>RANK ' + data.rankIndex + ' · ' + data.rankName + '</h3><p>' + data.rp + ' RP · ' + data.rpToNext + ' to ' + data.nextRank + '</p>' +
        '<h3>MISSION RATINGS</h3><div class="ratings">' + data.ratings.map((r) => '<span class="rating ' + r.toLowerCase() + '">' + r + '</span>').join('') + '</div>' +
        '<h3>SAVE SLOTS</h3>' + data.slots.map((s, i) => '<div class="slot"><b>' + (i + 1) + ' · ' + (s ? s.label : 'EMPTY') + '</b><span>' + (s ? s.detail : '—') + '</span></div>').join('') + '</div>';
    } else if (tab === 'MAP') {
      b.innerHTML = '<div class="statcol wide"><div id="pauseMapWrap"><canvas id="pauseMap" width="900" height="560"></canvas></div><p class="maphint">Click the map to set a waypoint · Districts show their standing</p></div>';
    } else if (tab === 'STORY') {
      b.innerHTML = '<div class="story">' + data.story.map((m) => '<div class="storyRow' + (m.done ? ' done' : '') + '"><b>' + m.id + '. ' + m.name + '</b><span>' + m.title + '</span><i>' + (m.done ? 'DONE · ' + m.rating : 'NOT STARTED') + '</i></div>').join('') + '</div>';
    } else if (tab === 'CREW') {
      b.innerHTML = '<div class="story">' + data.crew.map((c) => '<div class="storyRow"><b>' + c.name + ' · ' + c.role + '</b><span>' + c.ability + ' — ' + c.desc + '</span><i>Press ' + c.key + ' in game</i></div>').join('') + '</div>';
    } else if (tab === 'CONTROLS') {
      b.innerHTML = '<div class="story">' + data.controls.map((c) => '<div class="storyRow"><b>' + c.keys + '</b><span>' + c.what + '</span></div>').join('') + '</div>';
    } else if (tab === 'SAVE') {
      b.innerHTML = '<div class="story">' + data.slots.map((s, i) => '<div class="storyRow"><b>SLOT ' + (i + 1) + '</b><span>' + (s ? s.label + ' — ' + s.detail : 'Empty') + '</span><i>' + (s ? 'Saved ' + s.time : '') + '</i></div>').join('') + '<p class="maphint">Press F5 in game to quick-save to slot 1.</p></div>';
    } else if (tab === 'SETTINGS') {
      b.innerHTML = '<div class="story"><div class="storyRow"><b>SOUND</b><span>Engine, sirens and gunfire — procedural WebAudio</span><i>On</i></div><div class="storyRow"><b>TIME OF DAY</b><span>Day, sunset or night across the island</span><i>Sunset</i></div><div class="storyRow"><b>CAMERA</b><span>Chase camera with mouse orbit</span><i>Default</i></div></div>';
    }
  }
}
