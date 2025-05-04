let singleVideoTabId = null;
const OPENAI_API_KEY =
  "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";

function addTabUpdatedListener(tabId, callback) {
  function onUpdated(updatedTabId, info) {
    if (updatedTabId === tabId && info.status === "complete") {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      callback();
    }
  }
  chrome.tabs.onUpdated.addListener(onUpdated);

  function onRemoved(removedTabId) {
    if (removedTabId === tabId) {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    }
  }
  chrome.tabs.onRemoved.addListener(onRemoved);
}

function sendToSingleVideoTab(action) {
  if (singleVideoTabId) {
    chrome.tabs.sendMessage(singleVideoTabId, { action });
  }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  switch (message.action) {
    case "SingleVideo":
      chrome.tabs.create({ url: "https://www.youtube.com/" }, (tab) => {
        addTabUpdatedListener(tab.id, () => {
          singleVideoTabId = tab.id;
          chrome.tabs.sendMessage(tab.id, { action: "singlevideo" });
        });
      });
      break;
    case "Subscribe":
      sendToSingleVideoTab("subscribe");
      break;
    case "Like":
      sendToSingleVideoTab("like");
      break;
    case "Comment":
      sendToSingleVideoTab("comment");
      break;
    case "SubLikeCom":
      sendToSingleVideoTab("sublikecom");
      break;
    case "CloseTab":
      if (singleVideoTabId) chrome.tabs.remove(singleVideoTabId);
      break;
    case "ProcessLinks":
      processNextLink(message.activeArray);
      break;
    case "generatecomment":
      generateAIComment(message.videoTitle).then((comment) => {
        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "postcomment",
            comment,
            link: message.link,
          });
        }
      });
      break;
  }
});

async function generateAIComment(videoTitle) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const apiKey = OPENAI_API_KEY;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant that generates engaging YouTube comments as thoughtful and positive a critic on my behalf.",
          },
          {
            role: "user",
            content: `Generate a thoughtful, relevant, and respectful 5 to 10-word comment for a YouTube video based on its title: "${videoTitle}". Comments should be positive, engaging, and appropriate for the video's context. Do not include user or yourself in the comment.`,
          },
        ],
        max_tokens: 50,
      }),
    });
    const data = await response.json();
    return data.choices[0].message?.content?.trim();
  } catch (error) {
    console.error(`Error generating AI comment: ${error.message}`);
    return null;
  }
}

function getSubArrayByRange(arr, { min, max } = {}) {
  min = isNaN(min) ? 0 : min;
  max = isNaN(max) ? 0 : max;
  if (min === 0 && max === 0) return [];
  if (min === 0 && max > 0) return arr[max - 1] ? [arr[max - 1]] : [];
  if (max === 0 && min > 0) return arr[min - 1] ? [arr[min - 1]] : [];
  if (min > max) return [];
  return arr.slice(min - 1, max);
}

function processNextLink(activeArrayKey) {
  let rangeKey =
    activeArrayKey === "urlArray" ? "urlRangeArray" : "listRangeArray";
  chrome.storage.local.get(
    ["ytdRangeData", activeArrayKey, rangeKey],
    (data) => {
      const ytdRangeData = data.ytdRangeData || [];
      const ytdData =
        ytdRangeData.find((item) => item.activeRange === activeArrayKey) || {};
      const activeArrayData = data[activeArrayKey] || [];
      const rangeArray = data[rangeKey] || [];
      if (rangeArray.length === 0) {
        if (activeArrayData.length === 0) return;
        processLinkWithoutRange(activeArrayData, activeArrayKey);
      } else {
        processLinkWithRange(
          activeArrayData,
          rangeArray,
          ytdData,
          activeArrayKey
        );
      }
    }
  );
}

function processLinkWithoutRange(activeArrayData, activeArrayKey) {
  const currentLinkObj = activeArrayData[0];
  const currentLink = currentLinkObj.link;
  chrome.tabs.create({ url: currentLink, active: true }, (tab) => {
    let tabRemoved = false;
    addTabUpdatedListener(tab.id, () => {
      chrome.tabs.sendMessage(tab.id, { action: "sublikecom", currentLink });
    });
    const actionListener = function (msg, sender) {
      if (
        msg.action === "actionperformed" &&
        sender.tab &&
        sender.tab.id === tab.id
      ) {
        chrome.runtime.onMessage.removeListener(actionListener);
        activeArrayData.shift();
        let updateObj = {};
        updateObj[activeArrayKey] = activeArrayData;
        chrome.storage.local.set(updateObj, () => {
          if (activeArrayData.length > 0) processNextLink(activeArrayKey);
        });
        if (!tabRemoved) {
          tabRemoved = true;
          chrome.tabs.remove(tab.id);
        }
      }
    };
    chrome.runtime.onMessage.addListener(actionListener);
    chrome.tabs.onRemoved.addListener(function onTabRemoved(removedTabId) {
      if (removedTabId === tab.id) {
        chrome.runtime.onMessage.removeListener(actionListener);
        chrome.tabs.onRemoved.removeListener(onTabRemoved);
      }
    });
  });
}

function processLinkWithRange(
  activeArrayData,
  rangeArray,
  ytdData,
  activeArrayKey
) {
  const computedSubRangeArray = getSubArrayByRange(
    rangeArray,
    ytdData.subscribe
  );
  const computedLikeRangeArray = getSubArrayByRange(rangeArray, ytdData.like);
  const computedComRangeArray = getSubArrayByRange(rangeArray, ytdData.comment);
  const currentLinkObj = rangeArray[0];
  const currentLink =
    activeArrayKey === "listArray" ? currentLinkObj : currentLinkObj.link;
  chrome.tabs.create({ url: currentLink, active: true }, (tab) => {
    let tabRemoved = false;
    addTabUpdatedListener(tab.id, () => {
      if (activeArrayKey === "listArray") {
        if (computedSubRangeArray.includes(currentLink))
          chrome.tabs.sendMessage(tab.id, { action: "subscribe", currentLink });
        if (computedLikeRangeArray.includes(currentLink))
          chrome.tabs.sendMessage(tab.id, { action: "like", currentLink });
        if (computedComRangeArray.includes(currentLink))
          chrome.tabs.sendMessage(tab.id, { action: "comment", currentLink });
      } else {
        if (computedSubRangeArray.some((obj) => obj.id === currentLinkObj.id))
          chrome.tabs.sendMessage(tab.id, { action: "subscribe", currentLink });
        if (computedLikeRangeArray.some((obj) => obj.id === currentLinkObj.id))
          chrome.tabs.sendMessage(tab.id, { action: "like", currentLink });
        if (computedComRangeArray.some((obj) => obj.id === currentLinkObj.id))
          chrome.tabs.sendMessage(tab.id, { action: "comment", currentLink });
      }
      chrome.tabs.sendMessage(tab.id, { action: "endProcess" });
    });
    const actionListener = function (msg, sender) {
      if (
        msg.action === "actionperformed" &&
        sender.tab &&
        sender.tab.id === tab.id
      ) {
        chrome.runtime.onMessage.removeListener(actionListener);
        rangeArray.shift();
        let updateObj = {};
        let rangeKey =
          activeArrayKey === "urlArray" ? "urlRangeArray" : "listRangeArray";
        updateObj[rangeKey] = rangeArray;
        chrome.storage.local.set(updateObj, () => {
          if (rangeArray.length > 0) processNextLink(activeArrayKey);
        });
        if (!tabRemoved) {
          tabRemoved = true;
          chrome.tabs.remove(tab.id);
        }
      }
    };
    chrome.runtime.onMessage.addListener(actionListener);
    chrome.tabs.onRemoved.addListener(function onTabRemoved(removedTabId) {
      if (removedTabId === tab.id) {
        chrome.runtime.onMessage.removeListener(actionListener);
        chrome.tabs.onRemoved.removeListener(onTabRemoved);
      }
    });
  });
}
