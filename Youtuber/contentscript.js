let currentLink, videoLink;
let processedLinksMemory = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

chrome.storage.local.get("processedLinks", (data) => {
  processedLinksMemory = data.processedLinks || [];
});

async function findProcessedLink(link = videoLink, func) {
  let existingObj = processedLinksMemory.find((item) => item.link === link);
  if (!existingObj) {
    existingObj = { link, subscribed: false, liked: false, commented: false };
    processedLinksMemory.push(existingObj);
  }
  const mapping = { 1: "subscribed", 2: "liked", 3: "commented" };
  if (mapping[func] && !existingObj[mapping[func]]) {
    existingObj[mapping[func]] = true;
  }
  await new Promise((resolve) =>
    chrome.storage.local.set({ processedLinks: processedLinksMemory }, resolve)
  );
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  switch (message.action) {
    case "singlevideo":
      await singleVideo();
      break;
    case "postcomment":
      currentLink = message.link;
      await postComment(message.comment, currentLink);
      break;
    case "endProcess":
      await sleep(12000);
      chrome.runtime.sendMessage({ action: "actionperformed" });
      break;
    case "subscribe":
      currentLink = message.currentLink;
      await sleep(1000);
      await sub(currentLink);
      break;
    case "like":
      currentLink = message.currentLink;
      await sleep(1500);
      await like(currentLink);
      break;
    case "comment":
      currentLink = message.currentLink;
      await sleep(2500);
      await comments(currentLink);
      break;
    case "sublikecom":
      currentLink = message.currentLink;
      await sub(currentLink);
      await like(currentLink);
      await comments(currentLink);
      await sleep(8000);
      chrome.runtime.sendMessage({ action: "actionperformed" });
      break;
  }
});

async function singleVideo() {
  const firstVideo = document.querySelector("ytd-rich-grid-media a");
  if (firstVideo) {
    videoLink = `https://www.youtube.com${firstVideo.getAttribute("href")}`;
    firstVideo.click();
  }
}

function scrollIfNeeded(targetY) {
  if (window.scrollY !== targetY) {
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }
}

async function sub(link) {
  await sleep(2000);
  scrollIfNeeded(150);
  const subscribeButton = document.querySelector(
    "ytd-subscribe-button-renderer button"
  );
  if (subscribeButton && subscribeButton.textContent.trim() === "Subscribe") {
    subscribeButton.click();
  }
  await findProcessedLink(link, 1);
  await sleep(1000);
}

async function like(link) {
  await sleep(2000);
  scrollIfNeeded(200);
  const likeButton = document.querySelector("like-button-view-model button");
  if (likeButton && likeButton.title === "I like this") {
    likeButton.click();
  }
  await findProcessedLink(link, 2);
  await sleep(1000);
}

async function comments(link) {
  let checkComment = processedLinksMemory.find((item) => item.link === link);
  if (!checkComment || !checkComment.commented) {
    await sleep(2000);
    scrollIfNeeded(500);
    const videoTitle = document
      .querySelector("ytd-watch-metadata yt-formatted-string")
      ?.textContent?.trim();
    if (videoTitle) {
      chrome.runtime.sendMessage({
        action: "generatecomment",
        videoTitle,
        link,
      });
    }
  }
}

async function postComment(comment, link) {
  const commentBox = document.querySelector(
    "ytd-comments div#simple-box yt-formatted-string"
  );
  if (commentBox) {
    commentBox.click();
    document.execCommand("insertText", false, comment);
  }
  await sleep(2000);
  document.querySelector("ytd-button-renderer#submit-button button")?.click();
  await findProcessedLink(link, 3);
}
