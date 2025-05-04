document.addEventListener("DOMContentLoaded", () => {
  let activeArray = null;
  let urlArray = [];
  let listArray = [];
  let previousDropdownValue = "";
  let savedDropdownValue = "";
  let playlistProcessed = false;

  const contentSect1 = document.querySelector(".ytd-content");
  const contentSect2 = document.querySelector(".hidden-A");
  const contentSect3 = document.querySelector(".hidden-B");
  const contentSect4 = document.querySelector(".hidden-C");
  const filtersBtn = document.querySelector(".hide-1");
  const videoSection = document.querySelector(".ytd-videos");
  const videoMinInput = videoSection.querySelector("#ytd-initial");
  const videoMaxInput = videoSection.querySelector("#ytd-final");
  const subMin = document.querySelector(".ytd-subRange #ytd-initial");
  const subMax = document.querySelector(".ytd-subRange #ytd-final");
  const likeMin = document.querySelector(".ytd-likeRange #ytd-initial");
  const likeMax = document.querySelector(".ytd-likeRange #ytd-final");
  const comMin = document.querySelector(".ytd-comRange #ytd-initial");
  const comMax = document.querySelector(".ytd-comRange #ytd-final");
  const btnBacks = document.querySelectorAll("#btn-back, #btn-Back");
  const btnGoBack = document.getElementById("btn-Goback");

  const generateUniqueId = () =>
    Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

  const createSpan = (
    text,
    width,
    textAlign = "center",
    additionalStyles = {}
  ) => {
    const span = document.createElement("span");
    span.textContent = text;
    span.classList.add("span-cell");
    span.style.width = width;
    span.style.textAlign = textAlign;
    Object.assign(span.style, additionalStyles);
    return span;
  };

  const getStatusIcon = (status) => (status ? "✔️" : "❌");

  const showError = (message) => {
    const errorDiv = document.createElement("div");
    errorDiv.textContent = message;
    Object.assign(errorDiv.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(255, 0, 0, 0.9)",
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "5px",
      zIndex: "10000",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
    });
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
  };

  const showSection = (sectionToShow) => {
    [contentSect1, contentSect2, contentSect3, contentSect4].forEach(
      (sect) => (sect.style.display = "none")
    );
    sectionToShow.style.display = "flex";
  };

  const updateFilterButtonVisibility = () => {
    filtersBtn.style.display =
      contentSect2.style.display === "flex" ? "flex" : "none";
  };

  const getActiveList = () => {
    if (activeArray === "urlArray") {
      return { list: urlArray, key: "urlArray" };
    } else if (activeArray === "listArray") {
      return { list: listArray, key: "listArray" };
    }
    return { list: [], key: null };
  };

  const createHeader = (headerConfig) => {
    const headerRow = document.createElement("li");
    headerRow.classList.add("list-header");
    headerConfig.forEach((col) => {
      headerRow.appendChild(createSpan(col.text, col.width));
    });
    return headerRow;
  };

  const getSubArrayByRange = (arr, { min, max }) => {
    min = isNaN(min) ? 0 : min;
    max = isNaN(max) ? 0 : max;
    if (min === 0 && max === 0) return [];
    if (min === 0 && max > 0) return arr[max - 1] ? [arr[max - 1]] : [];
    if (max === 0 && min > 0) return arr[min - 1] ? [arr[min - 1]] : [];
    if (min > max) return [];
    return arr.slice(min - 1, max);
  };

  const enforceRestrictions = (
    aMin,
    aMax,
    vMin,
    vMax,
    aMinInput,
    aMaxInput
  ) => {
    let errors = "";
    if (vMin > vMax) {
      errors += "Main range: minimum value cannot exceed maximum value.\n";
      videoMinInput.style.border = "1px solid red";
      videoMaxInput.style.border = "1px solid red";
    } else {
      videoMinInput.style.border = "";
      videoMaxInput.style.border = "";
    }
    if (aMin > aMax) {
      errors += "Subrange: minimum value cannot exceed maximum value.\n";
      aMinInput.style.border = "1px solid red";
      aMaxInput.style.border = "1px solid red";
    } else {
      aMinInput.style.border = "";
      aMaxInput.style.border = "";
    }
    if (aMin < vMin && aMin !== 0) {
      errors += "Subrange minimum must be at least the main range minimum.\n";
      aMinInput.style.border = "1px solid red";
    }
    if (aMin > vMax) {
      errors += "Subrange minimum cannot exceed the main range maximum.\n";
      aMinInput.style.border = "1px solid red";
    }
    if (aMax < vMin && aMax !== 0) {
      errors += "Subrange maximum must be at least the main range minimum.\n";
      aMaxInput.style.border = "1px solid red";
    }
    if (aMax > vMax) {
      errors += "Subrange maximum cannot exceed the main range maximum.\n";
      aMaxInput.style.border = "1px solid red";
    }
    if (errors !== "") {
      showError(errors);
      return false;
    }
    return true;
  };

  function updateList() {
    const listEl = document.getElementById("input-list");
    listEl.innerHTML = "";
    listEl.style.textAlign = "center";

    const headerConfig = [
      { text: "No.", width: "5%" },
      { text: "Links", width: "35%" },
      { text: "Subscribed", width: "17%" },
      { text: "Liked", width: "12%" },
      { text: "Commented", width: "20%" },
      { text: "Remove", width: "11%" },
    ];
    listEl.appendChild(createHeader(headerConfig));

    if (activeArray === "listArray") {
      updateListForPlaylist(listEl);
    } else {
      updateListForRegular(listEl);
    }
  }

  function updateListForRegular(listEl) {
    const { list: activeList } = getActiveList();
    const countDisplay = document.getElementById("countDisplay");
    countDisplay.textContent =
      activeList.length > 0
        ? `Links Count: 1 to ${activeList.length}`
        : "Links Count: 0";
    chrome.storage.local.get("processedLinks", (storageData) => {
      const processedLinks = storageData.processedLinks || [];
      activeList.forEach((item, index) => {
        const li = document.createElement("li");
        li.classList.add("list-item");
        li.appendChild(createSpan(index + 1, "5%"));
        li.appendChild(createSpan(item.link, "35%"));
        const proc = processedLinks.find((p) => p.link === item.link);
        li.appendChild(
          createSpan(
            proc ? getStatusIcon(proc.subscribed) : "",
            "17%",
            "center",
            { margin: "0 5px", color: "#aaa7a7" }
          )
        );
        li.appendChild(
          createSpan(proc ? getStatusIcon(proc.liked) : "", "12%", "center", {
            margin: "0 5px",
            color: "#aaa7a7",
          })
        );
        li.appendChild(
          createSpan(
            proc ? getStatusIcon(proc.commented) : "",
            "20%",
            "center",
            { margin: "0 5px", color: "#aaa7a7" }
          )
        );
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Delete";
        removeBtn.classList.add("btn-delete");
        removeBtn.addEventListener("click", () => removeItem(index));
        li.appendChild(removeBtn);
        listEl.appendChild(li);
      });
    });
  }

  function updateListForPlaylist(listEl) {
    const selectedPlaylistId = previousDropdownValue || "";
    const countDisplay = document.getElementById("countDisplay");
    if (!selectedPlaylistId) {
      countDisplay.textContent = "Links Count: 0";
      return;
    }
    const playlist = listArray.find((item) => item.id === selectedPlaylistId);
    let subLinks = [];
    if (playlist && Array.isArray(playlist.subLinks)) {
      subLinks = playlist.subLinks;
    }
    if (!playlistProcessed) {
      countDisplay.textContent = "Links Count: 0";
      return;
    }
    countDisplay.textContent =
      subLinks.length > 0
        ? `Links Count: 1 to ${subLinks.length}`
        : "Links Count: 0";
    chrome.storage.local.get("processedLinks", (storageData) => {
      const processedLinks = storageData.processedLinks || [];
      subLinks.forEach((link, index) => {
        const li = document.createElement("li");
        li.classList.add("list-item");
        li.appendChild(createSpan(index + 1, "5%"));
        li.appendChild(createSpan(link, "35%"));
        const proc = processedLinks.find((p) => p.link === link);
        li.appendChild(
          createSpan(
            proc ? getStatusIcon(proc.subscribed) : "",
            "17%",
            "center",
            { margin: "0 5px", color: "#aaa7a7" }
          )
        );
        li.appendChild(
          createSpan(proc ? getStatusIcon(proc.liked) : "", "12%", "center", {
            margin: "0 5px",
            color: "#aaa7a7",
          })
        );
        li.appendChild(
          createSpan(
            proc ? getStatusIcon(proc.commented) : "",
            "20%",
            "center",
            { margin: "0 5px", color: "#aaa7a7" }
          )
        );
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Delete";
        removeBtn.classList.add("btn-delete");
        removeBtn.addEventListener("click", () => removeItem(index));
        li.appendChild(removeBtn);
        listEl.appendChild(li);
      });
    });
  }

  function updateRangeList() {
    const listEl = document.getElementById("input-list");
    listEl.innerHTML = "";
    listEl.style.textAlign = "center";

    const headerConfig = [
      { text: "No.", width: "20%" },
      { text: "Links", width: "80%" },
    ];
    listEl.appendChild(createHeader(headerConfig));

    const rangeKey =
      activeArray === "urlArray"
        ? "urlRangeArray"
        : activeArray === "listArray"
        ? "listRangeArray"
        : "urlRangeArray";

    chrome.storage.local.get(rangeKey, (data) => {
      const rangeList = data[rangeKey] || [];
      const countDisplay = document.getElementById("countDisplay");
      if (rangeList.length > 0) {
        countDisplay.textContent = `Links Count: 1 to ${rangeList.length}`;
        rangeList.forEach((item, index) => {
          const li = document.createElement("li");
          li.classList.add("list-item");
          li.appendChild(createSpan(index + 1, "20%"));
          const displayLink =
            activeArray === "listArray" && typeof item === "string"
              ? item
              : item.link;
          li.appendChild(createSpan(displayLink, "80%"));
          listEl.appendChild(li);
        });
      } else {
        countDisplay.textContent = "Links Count: 0";
      }
    });
  }

  function removeItem(index) {
    const { list, key } = getActiveList();
    if (key) {
      list.splice(index, 1);
      chrome.storage.local.set({ [key]: list }, updateList);
      if (activeArray === "listArray") updatePlaylistDropdown();
    }
  }

  [
    videoMinInput,
    videoMaxInput,
    subMin,
    subMax,
    likeMin,
    likeMax,
    comMin,
    comMax,
  ].forEach((input) =>
    input.addEventListener("input", () => (input.style.border = ""))
  );

  document.getElementById("ytd-filter").addEventListener("click", () => {
    chrome.storage.local.set({ popupState: "updated4" });
    showSection(contentSect4);
  });

  document.getElementById("btn-single").addEventListener("click", () => {
    chrome.storage.local.set({ popupState: "updated1" });
    showSection(contentSect3);
    chrome.runtime.sendMessage({ action: "SingleVideo" });
  });

  document.getElementById("btn-multi").addEventListener("click", () => {
    chrome.storage.local.set({ popupState: "updated2" }, () => {
      activeArray = "urlArray";
      showSection(contentSect2);
      updateList();
      updateFilterButtonVisibility();
    });
  });

  document.getElementById("btn-list").addEventListener("click", () => {
    chrome.storage.local.set({ popupState: "updated3" }, () => {
      activeArray = "listArray";
      showSection(contentSect2);
      updateList();
      updateFilterButtonVisibility();
      setupPlaylistInputs();
    });
  });

  document.getElementById("btn-add").addEventListener("click", () => {
    const rangeKey =
      activeArray === "urlArray"
        ? "urlRangeArray"
        : activeArray === "listArray"
        ? "listRangeArray"
        : "urlRangeArray";
    chrome.storage.local.get([rangeKey, "processedLinks"], (data) => {
      const inputField = document.getElementById("add-input");
      const input = inputField.value.trim();
      const rangeList = data[rangeKey] || [];
      if (rangeList.length > 0) {
        showError("The range is not empty.");
        inputField.value = "";
        return;
      }
      if (!input) {
        showError("Input is Empty.");
        return;
      }
      const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}(&.*)?$/;
      if (!youtubeRegex.test(input)) {
        showError("Please enter a valid YouTube video link.");
        inputField.value = "";
        return;
      }
      const processedLinks = data.processedLinks || [];
      const processedEntry = processedLinks.find((item) => item.link === input);
      if (processedEntry) {
        console.log(
          `Link ${input} is already processed. Status: Subscribed: ${processedEntry.subscribed}, Liked: ${processedEntry.liked}, Commented: ${processedEntry.commented}`
        );
      }
      const active = getActiveList();
      if (!active.list.some((item) => item.link === input)) {
        active.list.push({ id: generateUniqueId(), link: input });
        chrome.storage.local.set({ [active.key]: active.list }, updateList);
      } else {
        showError("This value is already in the list!");
      }
      inputField.value = "";
    });
  });

  document.getElementById("btn-submit").addEventListener("click", () => {
    const videosMin = parseInt(videoMinInput.value);
    const videosMax = parseInt(videoMaxInput.value);
    const subscribeMin = parseInt(subMin.value);
    const subscribeMax = parseInt(subMax.value);
    const likeMinVal = parseInt(likeMin.value);
    const likeMaxVal = parseInt(likeMax.value);
    const commentMin = parseInt(comMin.value);
    const commentMax = parseInt(comMax.value);

    const validSubscribe = enforceRestrictions(
      subscribeMin,
      subscribeMax,
      videosMin,
      videosMax,
      subMin,
      subMax
    );
    const validLike = enforceRestrictions(
      likeMinVal,
      likeMaxVal,
      videosMin,
      videosMax,
      likeMin,
      likeMax
    );
    const validComment = enforceRestrictions(
      commentMin,
      commentMax,
      videosMin,
      videosMax,
      comMin,
      comMax
    );
    if (!validSubscribe || !validLike || !validComment) return;

    let activeList, rangeArray;
    if (activeArray === "listArray") {
      const selectedPlaylistId = previousDropdownValue || "";
      if (!selectedPlaylistId) {
        showError("No playlist selected.");
        return;
      }
      const playlist = listArray.find((item) => item.id === selectedPlaylistId);
      const playlistLinks =
        playlist && Array.isArray(playlist.subLinks) ? playlist.subLinks : [];
      if (playlistLinks.length === 0) {
        showError(
          "No links available in the selected playlist to apply range."
        );
        return;
      }
      if (videosMin < 1 || videosMax > playlistLinks.length) {
        showError(
          `Videos range should be between 1 and ${playlistLinks.length}.`
        );
        return;
      }
      activeList = playlistLinks;
      rangeArray = getSubArrayByRange(playlistLinks, {
        min: videosMin,
        max: videosMax,
      });
      chrome.storage.local.set({ listRangeArray: rangeArray });
    } else {
      const activeObj = getActiveList();
      activeList = activeObj.list;
      if (activeList.length === 0) {
        showError("No links available in the active list to apply range.");
        return;
      }
      if (videosMin < 1 || videosMax > activeList.length) {
        showError(`Videos range should be between 1 and ${activeList.length}.`);
        return;
      }
      rangeArray = getSubArrayByRange(activeList, {
        min: videosMin,
        max: videosMax,
      });
      const rangeKey =
        activeArray === "urlArray" ? "urlRangeArray" : "urlRangeArray";
      chrome.storage.local.set({ [rangeKey]: rangeArray });
    }

    const ytdData = {
      videos: { min: videosMin, max: videosMax },
      subscribe: { min: subscribeMin, max: subscribeMax },
      like: { min: likeMinVal, max: likeMaxVal },
      comment: { min: commentMin, max: commentMax },
      activeRange: activeArray,
    };
    chrome.storage.local.get("ytdRangeData", (data) => {
      let ytdRangeData = data.ytdRangeData || [];
      const index = ytdRangeData.findIndex(
        (item) => item.activeRange === activeArray
      );
      if (index !== -1) {
        ytdRangeData[index] = ytdData;
      } else {
        ytdRangeData.push(ytdData);
      }
      chrome.storage.local.set({
        ytdRangeData: ytdRangeData,
        popupState: "updated2",
      });
      showSection(contentSect2);
      if (activeArray === "listArray") {
        setupPlaylistInputs();
      }
    });
  });

  document.getElementById("btn-start").addEventListener("click", () => {
    chrome.storage.local.get(["ytdRangeData"], (data) => {
      const ytdRangeData = data.ytdRangeData || [];
      const currentRange =
        ytdRangeData.find((item) => item.activeRange === activeArray) || null;
      chrome.runtime.sendMessage({
        action: "ProcessLinks",
        activeArray: activeArray,
        rangeData: currentRange,
      });
    });
  });

  document.getElementById("btn-subscribe").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "Subscribe" });
  });

  document.getElementById("btn-like").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "Like" });
  });

  document.getElementById("btn-comment").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "Comment" });
  });

  document.getElementById("btn-SLC").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "SubLikeCom" });
  });

  btnBacks.forEach((btn) => {
    btn.addEventListener("click", () => {
      chrome.storage.local.remove("popupState", () => {
        location.reload();
        chrome.runtime.sendMessage({ action: "CloseTab" });
      });
    });
  });

  btnGoBack.addEventListener("click", () => {
    const newPopupState = activeArray === "listArray" ? "updated3" : "updated2";
    chrome.storage.local.set({ popupState: newPopupState }, () => {
      showSection(contentSect2);
      if (activeArray === "listArray") {
        setupPlaylistInputs();
      }
    });
  });

  document.getElementById("btn-main").addEventListener("click", () => {
    if (activeArray) updateList();
  });

  document
    .getElementById("btn-range")
    .addEventListener("click", updateRangeList);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      const rangeKeys = ["urlRangeArray", "listRangeArray"];
      if (rangeKeys.some((key) => key in changes)) {
        updateRangeList();
      }
      if (
        changes.processedLinks &&
        (activeArray === "urlArray" || activeArray === "listArray")
      ) {
        updateList();
      }
      if (changes.listArray) {
        listArray = changes.listArray.newValue;
        updatePlaylistDropdown();
      }
      if (changes.previousDropdownValue) {
        previousDropdownValue = changes.previousDropdownValue.newValue;
      }
    }
  });

  function closePlaylistActionModal() {
    document.getElementById("modalOverlay").style.display = "none";
    document.getElementById("playlistActionModal").style.display = "none";
  }

  function setupPlaylistInputs() {
    const addInputContainer = document.querySelector(".add-input");
    addInputContainer.innerHTML = "";

    const addPlaylistBtn = document.createElement("button");
    addPlaylistBtn.id = "btn-add-playlist";
    addPlaylistBtn.textContent = "Add Playlist";
    addPlaylistBtn.addEventListener("click", () =>
      showModal("playlistAddModal")
    );

    const playlistDropdown = document.createElement("select");
    playlistDropdown.id = "playlist-dropdown";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select Playlist";
    playlistDropdown.appendChild(defaultOption);

    addInputContainer.appendChild(addPlaylistBtn);
    addInputContainer.appendChild(playlistDropdown);

    if (previousDropdownValue) {
      if (listArray.find((item) => item.id === previousDropdownValue)) {
        playlistDropdown.value = previousDropdownValue;
      } else {
        previousDropdownValue = "";
        playlistDropdown.value = "";
      }
    }

    playlistDropdown.addEventListener("focus", () => {
      savedDropdownValue = playlistDropdown.value;
    });
    playlistDropdown.addEventListener("change", () => {
      previousDropdownValue = playlistDropdown.value;
      chrome.storage.local.set({
        previousDropdownValue: previousDropdownValue,
      });
      if (playlistDropdown.value !== "") showModal("playlistActionModal");
    });
    playlistDropdown.addEventListener("click", () => {
      if (playlistDropdown.value !== "") showModal("playlistActionModal");
    });
    updatePlaylistDropdown();
  }

  function showModal(modalId) {
    document.getElementById("modalOverlay").style.display = "block";
    document.getElementById(modalId).style.display = "block";
  }

  window.closeModal = function (modalId) {
    document.getElementById("modalOverlay").style.display = "none";
    document.getElementById(modalId).style.display = "none";
  };

  function updatePlaylistDropdown() {
    const dropdown = document.getElementById("playlist-dropdown");
    if (dropdown) {
      dropdown.innerHTML = "";
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Select Playlist";
      dropdown.appendChild(defaultOption);
      listArray.forEach((item) => {
        if (item.name) {
          const option = document.createElement("option");
          option.value = item.id;
          option.textContent = item.name;
          dropdown.appendChild(option);
        }
      });
      dropdown.value =
        previousDropdownValue &&
        listArray.find((item) => item.id === previousDropdownValue)
          ? previousDropdownValue
          : "";
    }
  }

  const addModalBtn = document.getElementById("playlist-add-btn");
  const linkInput = document.getElementById("playlist-link-input");
  const nameInput = document.getElementById("playlist-name-input");
  if (addModalBtn) {
    addModalBtn.addEventListener("click", () => {
      const linkValInitial = linkInput.value.trim();
      const nameVal = nameInput.value.trim();
      if (linkValInitial === "" || nameVal === "") {
        showError("Please enter a valid YouTube playlist link and a name.");
        return;
      }
      let linkVal = linkValInitial;
      let urlObj;
      try {
        urlObj = new URL(linkVal);
      } catch (error) {
        showError("Invalid URL provided.");
        return;
      }
      const listId = urlObj.searchParams.get("list");
      if (!listId) {
        showError("Provided link does not contain a playlist ID.");
        return;
      }
      if (urlObj.pathname === "/watch") {
        linkVal = `https://www.youtube.com/playlist?list=${listId}`;
        console.log("Converted to playlist link:", linkVal);
      }
      const youtubePlaylistRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/playlist\?list=)[\w-]+(&.*)?$/;
      if (!youtubePlaylistRegex.test(linkVal)) {
        showError("Please enter a valid YouTube playlist link.");
        return;
      }
      if (listArray.some((item) => item.link === linkVal)) {
        showError("This playlist link already exists in the list!");
        return;
      }
      if (
        listArray.some(
          (item) => item.name.toLowerCase() === nameVal.toLowerCase()
        )
      ) {
        showError("This playlist name already exists in the list!");
        return;
      }
      fetch(linkVal)
        .then((response) => response.text())
        .then((html) => {
          const videoIds = [];
          const regex = /"videoId":"(.*?)"/g;
          let match;
          while ((match = regex.exec(html)) !== null) {
            const videoId = match[1];
            if (!videoIds.includes(videoId)) {
              videoIds.push(videoId);
            }
          }
          if (videoIds.length === 0) {
            showError("No video IDs were found in the playlist.");
            return;
          }
          const uniqueVideoIds = [...new Set(videoIds)];
          const listLinksArray = uniqueVideoIds.map(
            (id) => `https://www.youtube.com/watch?v=${id}`
          );
          console.log("Extracted video links:", listLinksArray);
          const newPlaylist = {
            id: generateUniqueId(),
            link: linkVal,
            name: nameVal,
            subLinks: listLinksArray,
          };
          listArray.push(newPlaylist);
          linkInput.value = "";
          nameInput.value = "";
          chrome.storage.local.set({ listArray: listArray }, () => {
            updatePlaylistDropdown();
            closeModal("playlistAddModal");
          });
        })
        .catch((err) => {
          showError("Error fetching playlist page: " + err);
        });
    });
  }

  const cancelBtn1 = document.getElementById("playlist-add-cancel-btn");
  if (cancelBtn1) {
    cancelBtn1.addEventListener("click", () => {
      linkInput.value = "";
      nameInput.value = "";
      closeModal("playlistAddModal");
    });
  }

  const actionProcessBtn = document.getElementById("playlist-process-btn");
  if (actionProcessBtn) {
    actionProcessBtn.addEventListener("click", () => {
      chrome.storage.local.set({ listRangeArray: [] }, () => {
        chrome.storage.local.set({ playlistProcessed: true }, () => {
          playlistProcessed = true;
          updateList();
          closePlaylistActionModal();
        });
      });
    });
  }

  const actionRemoveBtn = document.getElementById("playlist-remove-btn");
  if (actionRemoveBtn) {
    actionRemoveBtn.addEventListener("click", () => {
      const dropdown = document.getElementById("playlist-dropdown");
      const selectedId = dropdown.value;
      if (selectedId === "") {
        closeModal("playlistActionModal");
        return;
      }
      const index = listArray.findIndex((item) => item.id === selectedId);
      if (index !== -1) {
        listArray.splice(index, 1);
        chrome.storage.local.set({ listArray: listArray }, () => {
          closeModal("playlistActionModal");
        });
      } else {
        closeModal("playlistActionModal");
      }
    });
  }

  const cancelBtn2 = document.getElementById("playlist-action-cancel-btn");
  if (cancelBtn2) {
    cancelBtn2.addEventListener("click", () => {
      const dropdown = document.getElementById("playlist-dropdown");
      dropdown.value = savedDropdownValue;
      previousDropdownValue = savedDropdownValue;
      chrome.storage.local.set({ previousDropdownValue: savedDropdownValue });
      closePlaylistActionModal();
    });
  }

  chrome.storage.local.get(
    [
      "popupState",
      "urlArray",
      "listArray",
      "processedLinks",
      "playlistProcessed",
      "previousDropdownValue",
    ],
    (data) => {
      urlArray = data.urlArray || [];
      listArray = data.listArray || [];
      if (!data.processedLinks)
        chrome.storage.local.set({ processedLinks: [] });
      playlistProcessed = data.playlistProcessed || false;
      if (data.previousDropdownValue !== undefined) {
        previousDropdownValue = data.previousDropdownValue;
      }
      switch (data.popupState) {
        case "updated1":
          showSection(contentSect3);
          break;
        case "updated2":
          activeArray = "urlArray";
          showSection(contentSect2);
          updateList();
          updateFilterButtonVisibility();
          break;
        case "updated3":
          activeArray = "listArray";
          showSection(contentSect2);
          setupPlaylistInputs();
          updateList();
          updateFilterButtonVisibility();
          break;
        case "updated4":
          showSection(contentSect4);
          break;
        default:
          showSection(contentSect1);
          break;
      }
    }
  );
});
