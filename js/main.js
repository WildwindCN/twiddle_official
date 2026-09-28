(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const config = window.TWIDDLE_SITE || {};
  const isChina =
    location.hostname === "twiddle-ai.com.cn" ||
    location.hostname.endsWith(".twiddle-ai.com.cn");
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  let saved;
  try {
    saved = localStorage.getItem("twiddle-language");
  } catch {}
  let lang = ["en", "zh"].includes(saved)
    ? saved
    : isChina || isLocal
      ? "zh"
      : "en";
  const text = (zh, en) => (lang === "zh" ? zh : en);
  const market = $("#market");
  market.value = isChina || isLocal ? "cn" : "global";
  function updateStore() {
    const store = config.stores?.[market.value];
    const link = $("#shopLink");
    let url;
    try {
      url = new URL(store?.url);
    } catch {}
    const ready = store?.enabled === true && url?.protocol === "https:";
    link.href = ready ? url.href : "#release";
    link.textContent = ready
      ? text("进入官方商店 ↗", "Visit the official store ↗")
      : text("获取发售通知 ↗", "Get release updates ↗");
    $("#shopStatus").textContent = ready
      ? text("前往所选地区的官方商店", "Continue to the store for your region")
      : text("暂未开放购买", "Not yet available to order");
  }
  function setLanguage(next) {
    lang = next;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-zh][data-en]").forEach((el) => {
      el.textContent = el.dataset[lang];
    });
    $("#langSwitch").textContent = lang === "zh" ? "EN" : "中文";
    $("#langSwitch").setAttribute(
      "aria-label",
      lang === "zh" ? "Switch to English" : "切换为中文",
    );
    document.title = text(
      "Twiddle — 让灵感发声",
      "Twiddle — Make room for play.",
    );
    $('meta[name="description"]').content = text(
      "Twiddle 创造连接语言、声音与演奏的乐器。探索自然语言驱动的 AI 合成器原型 SEED。",
      "Twiddle makes instruments for the imagination. Meet SEED, a natural-language-driven synthesizer prototype.",
    );
    updateStore();
    try {
      localStorage.setItem("twiddle-language", lang);
    } catch {}
  }
  $("#langSwitch").addEventListener("click", () =>
    setLanguage(lang === "zh" ? "en" : "zh"),
  );
  market.addEventListener("change", updateStore);
  $("#year").textContent = new Date().getFullYear();
  document.querySelectorAll("[data-dialog]").forEach((button) =>
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.dialog).showModal();
    }),
  );
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog
      .querySelector(".dialog-close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          dialog.close();
      }
    });
  });
  const filing = config.filing || {};
  if (isChina) {
    for (const [number, href] of [
      [filing.icp, filing.icpUrl],
      [filing.police, filing.policeUrl],
    ]) {
      if (!number || !href) continue;
      let url;
      try {
        url = new URL(href);
      } catch {
        continue;
      }
      if (url.protocol !== "https:") continue;
      const a = document.createElement("a");
      a.href = url.href;
      a.textContent = number;
      a.target = "_blank";
      a.rel = "noopener";
      $("#filing").append(a);
      $("#filing").hidden = false;
    }
  }
  let pending = false;
  $("#waitlistForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pending || !event.currentTarget.reportValidity()) return;
    pending = true;
    const submit = $("#waitlistSubmit"),
      message = $("#waitlistMsg");
    submit.disabled = true;
    message.dataset.error = "false";
    message.textContent = text("正在提交…", "Submitting…");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: $("#waitlistContact").value.trim(),
          lang,
        }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true)
        throw new Error(response.status === 429 ? "rate" : "request");
      message.textContent = result.duplicate
        ? text(
            "你已在名单中，谢谢你的关注。",
            "You’re already on the list. Thanks for being here.",
          )
        : text(
            "登记成功。期待与你分享 SEED 的下一步。",
            "You’re on the list. We look forward to sharing what’s next.",
          );
      $("#waitlistForm").reset();
    } catch (error) {
      message.dataset.error = "true";
      message.textContent =
        error.message === "rate"
          ? text(
              "提交较频繁，请稍后再试。",
              "Too many attempts. Please try again later.",
            )
          : text(
              "暂时无法提交，请稍后重试，或联系 contact@twiddle-ai.com。",
              "Unable to submit. Please try again or email contact@twiddle-ai.com.",
            );
    } finally {
      clearTimeout(timer);
      pending = false;
      submit.disabled = false;
    }
  });
  setLanguage(lang);
})();
