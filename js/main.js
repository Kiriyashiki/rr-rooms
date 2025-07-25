let HISTORY_TIMER = null;
let HISTORY_MODE = false;
let HISTORY_DATE = null;
const MAX_MIIS_PER_REQUEST = 24;
const EXPIRE_TIME = 1000 * 60 * 60 * 24 * 7; // 1 week
const RELOAD_TIME = 1000 * 10; // 10 seconds
let RELOAD_TIMER = null;
let cur_rooms = [];
let FIRST_LOAD = true;

// Source: https://github.com/patchzyy/WheelWizard
const ROOM_TYPES = {
  "vs_10": "Retro VS",
  "vs_11": "Retro TT",
  "vs_12": "Retro 200cc",
  "vs_20": "CT VS",
  "vs_21": "CT TT",
  "vs_22": "CT 200cc",
  "vs_666": "Luminous",
  "vs_668": "CTGP-C",
  "vs_751": "Versus",
  "vs_-1": "Regular",
  "vs": "Regular",
  "vs_69": "IKW Default",
  "vs_70": "IKW Ultras VS",
  "vs_71": "IKW Crazy Items",
  "vs_72": "IKW Bob-omb Blast",
  "vs_73": "IKW Infinite Acceleration",
  "vs_74": "IKW Banana Slip",
  "vs_75": "IKW Random Items",
  "vs_76": "IKW Unfair Items",
  "vs_77": "IKW Blue Shell Madness",
  "vs_78": "IKW Mushroom Dash",
  "vs_79": "IKW Bumper Karts",
  "vs_80": "IKW Item Rampage",
  "vs_81": "IKW Item Rain",
  "vs_82": "IKW Shell Break",
  "vs_83": "IKW Riibalanced Stats",
  "vs_875": "OptPack VS",
  "vs_876": "OptPack TT",
  "vs_877": "OptPack",
  "vs_878": "OptPack",
  "vs_879": "OptPack",
  "vs_880": "OptPack",
  "vs_1312": "WTP 150cc",
  "vs_1313": "WTP 200cc",
  "vs_1314": "WTP TT"
};

function getBgClass(type) {
  console.log(type)
  switch (type) {
    case "vs_10":
      return "rr-vs"
    case "vs_11":
      return "rr-ota"
    case "vs_12":
      return "rr-vs-200"
    case "vs_20":
      return "rr-ct"
    case "vs_21":
      return "rr-ct-ota"
    case "vs_22":
      return "rr-ct-200"
    case "vs_-1":
      return "reg"
    case "vs":
      return "reg"
    case "vs_69":
      return "ikw"
    case "vs_70":
      return "ikw"
    case "vs_71":
      return "ikw"
    case "vs_72":
      return "ikw"
    case "vs_73":
      return "ikw"
    case "vs_74":
      return "ikw"
    case "vs_75":
      return "ikw"
    case "vs_76":
      return "ikw"
    case "vs_77":
      return "ikw"
    case "vs_78":
      return "ikw"
    case "vs_79":
      return "ikw"
    case "vs_80":
      return "ikw"
    case "vs_81":
      return "ikw"
    case "vs_82":
      return "ikw"
    case "vs_83":
      return "ikw"
    case "vs_875":
      return "opt"
    case "vs_876":
      return "opt"
    case "vs_878":
      return "opt"
    case "vs_879":
      return "opt"
    case "vs_880":
      return "opt"
    case "vs_1312":
      return "wtp"
    case "vs_1313":
      return "wtp"
    case "vs_1314":
      return "wtp"
    default:
      return "def"
  }
}

function getColorForValue(value) {
  // Clamp to [1,30000]
  const v = Math.min(30000, Math.max(0, value));

  // Define our stops: position (0–1) and base color
  const stops = [
    { pos: 0.0,  color: [128,   0, 128] }, // purple
    { pos: 0.1667, color: [255,   0,   0] }, // red
    { pos: 0.3333, color: [255, 165,   0] }, // orange
    { pos: 0.5,    color: [255, 255,   0] }, // yellow
    { pos: 0.6667, color: [  128, 255,   0] }, // green-ish-yellow-thang
    { pos: 0.7778, color: [  0, 255,   0] }, // green
    { pos: 1.0,    color: [  0,   128, 255] }, // blue
  ];

  // Normalize value to [0,1]
  const t = (v - 1) / (30000 - 1);

  // Find which segment we're in
  let lower = stops[0], upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i+1].pos) {
      lower = stops[i];
      upper = stops[i+1];
      break;
    }
  }

  // Local interpolation factor between lower and upper
  const range = upper.pos - lower.pos;
  const tt = range === 0 ? 0 : (t - lower.pos) / range;

  // Linear interpolate each RGB channel
  const lerp = (a, b, f) => a + (b - a) * f;
  let [r, g, b] = [
    lerp(lower.color[0], upper.color[0], tt),
    lerp(lower.color[1], upper.color[1], tt),
    lerp(lower.color[2], upper.color[2], tt),
  ];

  // Darken by 75% => keep 25% brightness
  r = Math.round(r * 0.375);
  g = Math.round(g * 0.375);
  b = Math.round(b * 0.375);

  // Convert to hex and zero-pad
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function on_history_change() {
  if (HISTORY_TIMER) {
    clearTimeout(HISTORY_TIMER);
  }
  HISTORY_TIMER = setTimeout(change_history, 1000);
}

function add_history(minutes) {
  let history_input = document.getElementById("history-input");
  let history_time = new Date(history_input.value).getTime();
  history_time += minutes * 60 * 1000;
  let timezone_offset = new Date().getTimezoneOffset() * 60000;
  history_time -= timezone_offset;
  history_input.value = new Date(history_time).toISOString().slice(0, 16);
  on_history_change();
}

function change_history() {
  console.log("History mode enabled.");
  HISTORY_MODE = true;
  on_checkbox();
  fetch_rooms();
}

function disable_history() {
  HISTORY_MODE = false;
  let params = new URL(window.location.href).searchParams;
  params.delete("time");
  window.history.replaceState(null, null, `?${params.toString()}`);
  fetch_rooms()
}

function _escape(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/(?:\r\n|\r|\n)/g, '');
}

function handle_mii_name(name) {
  if (name.length > 10) {
    return name.substring(0, 10);
  }

  return filter_mii_name(_escape(name));
}

function char_code_is_wide(char_code) {
  if (char_code >= 0xF103 && char_code <= 0xF12F) {
    return true;
  }

  // …
  return char_code === 0x2026;
}

function filter_mii_name(name) {
  // If a character is between 0xF103 and 0xF12F, place it within <span class="wide-char">
  let new_name = "";
  let special_char = false;
  for (let i = 0; i < name.length; i++) {
    const char_code = name.charCodeAt(i);
    if (char_code_is_wide(char_code)) {
      if (!special_char) {
        new_name += "<span class=\"wide-char\">";
        special_char = true;
      }
    } else if (special_char) {
      new_name += "</span>";
      special_char = false;
    }
    new_name += name[i];
  }

  if (special_char) {
    new_name += "</span>";
  }

  return new_name;
}

function on_fc_change() {
  const fc = document.getElementById("fc-input").value;
  localStorage.setItem("highlight-fc", fc);
  reload_rooms();
}

function fix_split_rooms(rooms) {
  let new_rooms = [];

  for (let room of rooms) {
    const player_keys = Object.keys(room.players)

    room.split = false;

    // if (player_keys.length <= 13){
    //     new_rooms.push(room);
    //     continue;
    // }

    let player_data = [];

    for (const element of player_keys) {
      player_data.push([]);
    }

    for (let i = 0; i < player_keys.length; i++) {
      const player = room.players[player_keys[i]];
      const conn_map = player.conn_map;

      for (let j = 0; j < conn_map.length; j++) {
        if (conn_map[j] !== "0") {
          let their_idx = j;

          if (their_idx >= i) {
            their_idx += 1;
          }

          player_data[i].push(their_idx);
        }
      }
    }

    let seen_players = [];

    let sub_rooms = [];

    for (let i = 0; i < player_data.length; i++) {
      if (seen_players.indexOf(i) !== -1) {
        continue;
      }

      let new_room = JSON.parse(JSON.stringify(room));
      new_room.players = {};

      let new_players_idx = [];

      function recursive_add(idx) {
        if (seen_players.indexOf(idx) !== -1) {
          return;
        }

        seen_players.push(idx);

        let cur_connected = player_data[idx];
        for (const connected_idx of cur_connected) {
          if (player_data[connected_idx].indexOf(idx) === -1) {
            // Ensure two-way connection.
            continue;
          }
          recursive_add(connected_idx);
        }

        new_players_idx.push(idx);
      }

      recursive_add(i);

      // Sort new_players_idx ascending.
      new_players_idx.sort((a, b) => a - b);

      for (const idx of new_players_idx) {
        new_room.players[player_keys[idx]] = room.players[player_keys[idx]];
      }

      sub_rooms.push(new_room);

    }

    if (sub_rooms.length > 1) {
      sub_rooms.forEach((sub_room) => {
        sub_room.split = true;

        if (Object.keys(room.players)[0] in sub_room.players) {
          sub_room.split = false;
        }
      });

      let fc = document.getElementById("fc-input").value;
      if (fc) {
        let tmp = [];
        for (const element of sub_rooms) {
          const room = element;

          let found = false;

          for (const player_idx of Object.keys(room.players)) {
            const player = room.players[player_idx];

            if (player.fc === fc) {
              tmp.unshift(room);
              found = true;
              break;
            }
          }

          if (!found) {
            tmp.push(room);
          }
        }

        sub_rooms = tmp;
      }

      new_rooms = new_rooms.concat(sub_rooms);
    } else {
      new_rooms.push(room);
    }

  }

  return new_rooms;

}

function filter_fc(rooms) {
  // If the filter FC is found, place that room at the top.
  const fc = localStorage.getItem("highlight-fc");

  if (!fc) {
    return rooms;
  }

  let new_rooms = [];

  for (const element of rooms) {
    const room = element;

    let found = false;

    for (const player_idx of Object.keys(room.players)) {
      const player = room.players[player_idx];

      if (player.fc === fc) {
        new_rooms.unshift(room);
        found = true;
        break;
      }
    }

    if (!found) {
      new_rooms.push(room);
    }
  }

  return new_rooms;
}


let prev_uptime_update_date = null;
let uptimes_timer = null;

function update_uptimes(skip_reset = false) {
  const time_spans = document.querySelectorAll("span[created]");

  // Calculate days, hours, minutes and seconds since the room was created
  // Uptime is a datetime string.
  if (!HISTORY_MODE || skip_reset || FIRST_LOAD) {
    FIRST_LOAD = false;
    for (const time_span of time_spans) {
      const created = new Date(time_span.getAttribute("created"));
      let now = new Date();
      if (HISTORY_MODE) {
        now = HISTORY_DATE;
      }
      const diff = now - created;

      let seconds = Math.floor(diff / 1000);
      let minutes = Math.floor(seconds / 60);
      let hours = Math.floor(minutes / 60);
      let days = Math.floor(hours / 24);

      hours = hours - (days * 24);
      minutes = minutes - (days * 24 * 60) - (hours * 60);
      seconds = seconds - (days * 24 * 60 * 60) - (hours * 60 * 60) - (minutes * 60);

      let padded_seconds = seconds.toString().padStart(2, "0");
      let padded_minutes = minutes.toString().padStart(2, "0");
      let padded_hours = hours.toString().padStart(2, "0");

      let str = `${hours}:${padded_minutes}:${padded_seconds}`;
      if (days > 0) {
        str = `${days}:${padded_hours}:${padded_minutes}:${padded_seconds}`;
      }

      time_span.textContent = str;
    }
  }

  if (skip_reset) {
    return;
  }

  let timeout_ms = 1000;
  if (prev_uptime_update_date) {
    timeout_ms -= (Date.now() - prev_uptime_update_date);
  }

  prev_uptime_update_date = Date.now();

  if (uptimes_timer) {
    clearTimeout(uptimes_timer);
  }
  uptimes_timer = setTimeout(update_uptimes, timeout_ms);
}

function on_checkbox() {
  if (document.getElementById("timeout-checkbox").checked) {
    if (RELOAD_TIMER) {
      clearInterval(RELOAD_TIMER);
    }

    if (HISTORY_MODE) {
      RELOAD_TIMER = setInterval(on_checkbox, RELOAD_TIME);
    } else {
      RELOAD_TIMER = setInterval(fetch_rooms, RELOAD_TIME);
    }

  } else if (RELOAD_TIMER) {
    clearInterval(RELOAD_TIMER);
  }
  localStorage.setItem("auto-reload", document.getElementById("timeout-checkbox").checked);
}

function on_private_checkbox() {
  const checkbox = document.getElementById("private-checkbox");
  localStorage.setItem("show-private", checkbox.checked);
  reload_rooms();
}

function on_openhost_checkbox() {
  const checkbox = document.getElementById("openhost-checkbox");
  localStorage.setItem("openhost", checkbox.checked);
  update_openhost_underline();
}

function update_openhost_underline() {
  let openhost_status = document.getElementById("openhost-checkbox").checked;
  document.querySelectorAll("td[openhost]").forEach((td) => {
    if (openhost_status) {
      td.classList.add("openhost");
    } else {
      td.classList.remove("openhost");
    }
  });
}

// Miis are stored as key "mii_{data}": "[image, datetime]"
function remove_expired_mii_images() {
  let remove_keys = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key.startsWith("mii_")) {
      const mii_data = JSON.parse(localStorage.getItem(key));

      if (Date.now() - mii_data[1] > EXPIRE_TIME) {
        remove_keys.push(key);
      }
    }

    for (const key of remove_keys) {
      localStorage.removeItem(key);
    }
  }
}

function get_cached_mii_image(mii_data) {
  const mii_data_key = `mii_${mii_data}`;
  const mii_data_str = localStorage.getItem(mii_data_key);

  if (!mii_data_str) {
    return null;
  }

  const mii_data_arr = JSON.parse(mii_data_str);

  if (Date.now() - mii_data_arr[1] > EXPIRE_TIME) {
    localStorage.removeItem(mii_data_key);
    return null;
  }

  return mii_data_arr[0];
}

function set_cached_mii_image(mii_data, mii_image) {
  const mii_data_key = `mii_${mii_data}`;
  const mii_data_arr = [mii_image, Date.now()];

  localStorage.setItem(mii_data_key, JSON.stringify(mii_data_arr));
}

function apply_mii_image(mii_data, mii_image) {
  set_cached_mii_image(mii_data, mii_image);

  const mii_elements = document.querySelectorAll(`img[mii-data="${mii_data}"]`)

  if (!mii_elements) {
    return;
  }

  for (const mii_element of mii_elements) {
    mii_element.src = mii_image;
  }
}

async function fetch_mii_images(mii_data_list) {
  // Fetch Mii images
  let new_mii_data_list = [];

  // Handle cached images
  for (const mii_data of mii_data_list) {
    let mii_image = get_cached_mii_image(mii_data);

    if (mii_image) {
      // Apply cached image
      apply_mii_image(mii_data, mii_image);
    } else {
      // Fetch new image
      new_mii_data_list.push(mii_data);
    }
  }

  if (new_mii_data_list.length > MAX_MIIS_PER_REQUEST) {
    const mii_data_list_copy = new_mii_data_list.slice();
    new_mii_data_list = mii_data_list_copy.splice(0, MAX_MIIS_PER_REQUEST);
    fetch_mii_images(mii_data_list_copy);
  }

  if (new_mii_data_list.length > 0) {
    const mii_data_response = await fetch("https://umapyoi.net/api/v1/mii", {
      method: "POST",
      body: JSON.stringify(new_mii_data_list)
    });

    if (!mii_data_response.ok) {
      console.log("Error fetching Mii data from umapyoi.net");
      return;
    }

    const mii_dict = await mii_data_response.json();

    // console.log(mii_dict);

    for (const mii_data of Object.keys(mii_dict)) {
      apply_mii_image(mii_data, mii_dict[mii_data]);
    }
  }
}

async function on_load() {
  document.getElementById("timeout-checkbox").checked = localStorage.getItem("auto-reload") == "true";
  document.getElementById("fc-input").value = localStorage.getItem("highlight-fc") || "";
  let priv = localStorage.getItem("show-private");
  priv = priv == null ? true : priv === "true";
  document.getElementById("private-checkbox").checked = priv;

  let oh = localStorage.getItem("openhost");
  oh = oh == null ? true : oh === "true";
  document.getElementById("openhost-checkbox").checked = oh;

  const url = new URL(window.location.href);
  const params = url.searchParams;
  const timestamp = params.get("time");

  if (timestamp) {
    HISTORY_MODE = true;
    let timezone_offset = new Date().getTimezoneOffset() * 60000;
    HISTORY_DATE = new Date(parseInt(timestamp) * 1000 - timezone_offset);
    document.getElementById("history-input").value = HISTORY_DATE.toISOString().slice(0, 16);
    change_history();
    return;
  }

  fetch_rooms();
}

async function fetch_rooms() {
  console.log("Loading data...");
  remove_expired_mii_images();

  let checkbox = document.getElementById("timeout-checkbox");
  let history_indicator = document.getElementById("history-indicator");

  let timestamp_part = "";

  if (HISTORY_MODE) {
    let datetime = document.getElementById("history-input").value;
    let history_time = Math.max(0, new Date(datetime).getTime());
    if (isNaN(history_time)) {
      history_time = 0;
    }
    let history_date = new Date(history_time);
    HISTORY_DATE = history_date;
    let unix_seconds = Math.floor(history_date.getTime() / 1000);
    let params = new URL(window.location.href).searchParams
    params.set("time", unix_seconds);
    window.history.replaceState(null, null, `?${params.toString()}`);
    timestamp_part = `/${unix_seconds}`;

    checkbox.disabled = true;
    history_indicator.style.display = "block";

    document.getElementById("tablebody").innerHTML = "";
    document.querySelector("#top-container").style.display = "none";
    document.querySelector("#loading").style.display = "block";
  } else {
    checkbox.disabled = false;
    history_indicator.style.display = "none";
  }

  const response = await fetch("https://umapyoi.net/api/v1/rr-rooms" + timestamp_part);

  if (!response.ok) {
    console.log("Error fetching room data from zplwii.xyz");
    return;
  }


  let rooms = await response.json();

  let date = new Date();

  if (HISTORY_MODE) {
    let received_timestamp = rooms.timestamp;
    date = new Date(received_timestamp * 1000);
    rooms = rooms.data;
  }

  cur_rooms = rooms;
  reload_rooms();

  let timezone_offset = date.getTimezoneOffset() * 60000;
  let local_time = new Date(date.getTime() - timezone_offset);
  let timestamp = local_time.toISOString().slice(0, 16);

  let history_input = document.getElementById("history-input");
  history_input.value = timestamp;
}

async function reload_rooms() {
  let rooms = cur_rooms;
  let no_players = 0;
  // console.log(rooms);

  const tbody = document.getElementById("tablebody");
  // Clear table
  tbody.innerHTML = "";

  const url = new URL(window.location.href);
  const params = url.searchParams;
  const filter_room = params.get("room");
  let room_not_found = true;

  rooms = filter_fc(rooms);
  rooms = fix_split_rooms(rooms);

  let rooms_count = 0;

  for (const room of rooms) {
    if (filter_room && room.id !== filter_room) {
      continue;
    }

    if (!filter_room && !document.getElementById("private-checkbox").checked && room.type !== "anybody") {
      continue;
    }

    rooms_count += 1;
    room_not_found = false;

    // Room Info
    let tr = document.createElement("tr");
    let tdd = document.createElement("td");
    tdd.textContent = " ";
    tdd.colSpan = 6;
    tdd.style.border = "1px solid #181a1b";
    tr.appendChild(tdd);
    tbody.appendChild(tr);

    tr = document.createElement("tr");
    let room_header = document.createElement("th");
    room_header.classList.add(getBgClass(room.rk))
    room_header.colSpan = 100;
    room_header.classList.add("room-header");
    let room_type = room.type === "anybody" ? "🌎 Public" : "🔒 Private";


    let joinable = room.suspend ? "Not joinable" : "Joinable";
    if (room.split) {
      joinable = "Split room";
    }

    let joinable_class = room.suspend ? "not-joinable" : "joinable";
    if (room.split) {
      joinable_class = "split-room";
    }

    let room_no_players = 0;
    tr.appendChild(room_header);
    tbody.appendChild(tr);

    // Data Headers
    tr = document.createElement("tr");
    tr.classList.add("data-header");
    tbody.appendChild(tr);

    // Mii Name
    th = document.createElement("th");
    th.textContent = "Mii Name";
    th.colSpan = 2;
    tr.appendChild(th);

    // // Mii
    th = document.createElement("th");
    th.textContent = "Mii";
    th.classList.add("mii-header");
    tr.appendChild(th);

    // Friend Code
    th = document.createElement("th");
    th.textContent = "Friend Code";
    tr.appendChild(th);

    // // Connection fail
    // th = document.createElement("th");
    // th.textContent = "Conn\r\nFail";
    // th.classList.add("conn-fail");
    // tr.appendChild(th);

    // VR
    th = document.createElement("th");
    th.textContent = "VR";
    tr.appendChild(th);

    // BR
    th = document.createElement("th");
    th.textContent = "BR";
    tr.appendChild(th);

    let evavg = 0;
    let ebavg = 0;

    // Players
    for (const player_idx of Object.keys(room.players)) {
      let mii_idx = 0;
      let no_miis = 1;

      if ('mii' in room.players[player_idx]) {
        no_miis = room.players[player_idx].mii.length;
      }

      for (let cur_mii_idx = 0; cur_mii_idx < no_miis; cur_mii_idx++) {
        no_players++;
        room_no_players++;

        tr = document.createElement("tr");
        tbody.appendChild(tr);

        const player = room.players[player_idx];

        // Mii Name
        let td = document.createElement("td");
        td.colSpan = 2;
        let name_ele = td;

        if (cur_mii_idx > 0) {
          name_ele = document.createElement("td");
          name_ele.classList.add("guest-name");
          td.classList.add("guest-td");
          td.colSpan = 1;
          name_ele.colSpan = 1;

          if (Object.keys(room.players).indexOf(player_idx) === Object.keys(room.players).length - 1 || cur_mii_idx < no_miis - 1) {
            td.style.borderBottom = "hidden";
          }
        }

        name_ele.classList.add("mii-name");
        name_ele.innerHTML = handle_mii_name('mii' in player ? player.mii[cur_mii_idx].name : player.name);
        tr.appendChild(td);

        if (cur_mii_idx > 0) {
          tr.appendChild(name_ele);
        }

        // Mii
        td = document.createElement("td");
        td.classList.add("mii-td");
        let img = document.createElement("img");
        img.width = 64;
        img.height = 64;
        img.alt = "Mii";
        img.classList.add("mii");
        img.src = "empty.png";
        td.appendChild(img);
        tr.appendChild(td);

        if ('mii' in player) {
          img.setAttribute("mii-data", player.mii[cur_mii_idx].data);
        }

        // Friend Code
        td = document.createElement("td");
        td.textContent = cur_mii_idx === 0 ? player.fc : "Guest";
        // if (cur_mii_idx == 0 && player_idx == room.host){
        //     td.style.fontWeight = "bold";
        // }

        if (player.fc === localStorage.getItem("highlight-fc")) {
          tr.classList.add("highlighted");
        }

        if (player["openhost"] && player.openhost === "true" && cur_mii_idx === 0) {
          td.setAttribute("openhost", "");
          td.title = "OpenHost enabled";
        }

        tr.appendChild(td);

        // // Connection fail
        // td = document.createElement("td");
        // td.textContent = cur_mii_idx == 0 ? player.conn_fail : "--";
        // tr.appendChild(td);

        // VR
        td = document.createElement("td");
        td.textContent = cur_mii_idx === 0 ? player.ev : "";
        let vr = parseInt(player.ev);
        if (Number.isNaN(vr)) {
          vr = 0;
        }
        evavg += vr;
        td.style.backgroundColor = getColorForValue(vr);
        tr.appendChild(td);

        // BR
        td = document.createElement("td");
        td.textContent = cur_mii_idx === 0 ? player.eb : "";
        vr = parseInt(player.eb);
        if (Number.isNaN(vr)) {
          vr = 0;
        }
        ebavg += vr;
        td.style.backgroundColor = getColorForValue(vr);
        tr.appendChild(td);
      }
    }

    tr = document.createElement("tr");
    tr.style.borderTop = "2px solid #e8e6e3";
    tbody.appendChild(tr);

    let td = document.createElement("td");
    td.textContent = "VR Average";
    td.colSpan = 4;
    td.style.textAlign = "right";
    tr.appendChild(td);

    td = document.createElement("td");
    let vr = (Math.floor(evavg / room_no_players)).toString();
    td.textContent = vr;
    td.style.backgroundColor = getColorForValue(vr);
    tr.appendChild(td);

    td = document.createElement("td");
    vr = (Math.floor(ebavg / room_no_players)).toString();
    td.textContent = vr;
    td.style.backgroundColor = getColorForValue(vr);
    tr.appendChild(td);

    // Apply the room header text.
    let skip_reset = false;

    let rk = room.rk;
    if (rk && rk in ROOM_TYPES) {
      rk = `<span title="${rk}">${ROOM_TYPES[rk]}</span>`;
    } else if (rk) {
      rk = rk.toUpperCase();
    }

    let params = new URL(window.location.href).searchParams;
    params.set("room", room.id);
    let room_link = `?${params.toString()}`;
    room_header.innerHTML = `${room_type} ${rk ? rk + " " : ""}Room <a href="${room_link}" class="room-link">${room.id}</a> – Uptime: <span created="${room.created}"></span>\r\n${room_no_players} player${room_no_players == 1 ? "" : "s"} – <span class="${joinable_class}">${joinable}</span>`;
    if (uptimes_timer) {
      skip_reset = true;
    }
    update_uptimes(skip_reset);

  }

  document.querySelector("#loading").style.display = "none";
  if (!filter_room) {
    document.querySelector("#no-rooms").textContent = rooms_count;
    document.querySelector("#no-players").textContent = no_players;

    document.querySelector("#top-container").style.display = "flex";
  }

  if (room_not_found) {
    document.querySelector("#top-container").style.display = "none";
    document.querySelector("#not-found-container").style.display = "block";
    return;
  }

  document.querySelector("#not-found-container").style.display = "none";

  update_openhost_underline();

  // document.querySelector(".room-header").style.borderTop = "hidden";

  // Fetch Mii images
  let mii_data_list = [];

  for (const img_element of document.querySelectorAll("img[mii-data]")) {
    mii_data_list.push(img_element.getAttribute("mii-data"));
  }

  if (document.getElementById("timeout-checkbox").checked) {
    if (RELOAD_TIMER) {
      clearInterval(RELOAD_TIMER);
    }

    if (HISTORY_MODE) {
      RELOAD_TIMER = setInterval(on_checkbox, RELOAD_TIME);
    } else {
      RELOAD_TIMER = setInterval(fetch_rooms, RELOAD_TIME);
    }
  }

  fetch_mii_images(mii_data_list);

}

if (document.addEventListener)
  document.addEventListener('DOMContentLoaded', on_load, false)
else window.onload = fetch_rooms
