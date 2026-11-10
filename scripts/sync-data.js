#!/usr/bin/env node
/**
 * Đồng bộ dữ liệu từ https://dbk.edu.vn/ML/exercises/ về data/quiz.js
 *
 * Cách chạy:  node scripts/sync-data.js
 *
 * Ghi đè data/quiz.js. Trả lời đúng được lấy từ chính API "submit" của trang
 * nguồn (server trả về đáp án đúng cho mỗi câu).
 */

const fs = require("fs");
const path = require("path");

const BASE = "https://dbk.edu.vn/ML/exercises";
const OUT = path.join(__dirname, "..", "data", "quiz.js");

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

async function main() {
  const chapterIds = [
    "l2-data-preprocessing",
    "l3-linear-regression",
    "l4-5-clustering",
    "l6-decision-tree",
    "l7-neural-network",
    "l8-svm"
  ];

  const chapters = [];

  for (const chapterId of chapterIds) {
    const topicsMeta = await getJSON(`${BASE}/chapters/${chapterId}/topics`);
    console.log(`✔ ${chapterId}: ${topicsMeta.topics.length} topic`);

    const topics = [];

    for (const topicMeta of topicsMeta.topics) {
      const detail = await getJSON(
        `${BASE}/chapters/${chapterId}/topics/${topicMeta.id}`
      );

      // Lấy đáp án đúng: gửi toàn bộ option, server trả về đáp án đúng.
      const answers = detail.questions.map((q) => ({
        id: q.id,
        selected: q.options.map((o) => o.key)
      }));
      const graded = await postJSON(`${BASE}/submit`, {
        chapter_id: chapterId,
        topic_id: topicMeta.id,
        answers
      });
      const keyById = new Map(graded.results.map((r) => [r.id, r.answers]));

      const questions = detail.questions.map((q) => ({
        id: q.id,
        text: q.text,
        multiple: Boolean(q.multiple),
        options: q.options.map((o) => ({ k: o.key, t: o.text })),
        answer: toArray(keyById.get(q.id))
      }));

      topics.push({
        id: topicMeta.id,
        title: topicMeta.title,
        summary: toArray(detail.topic.summary),
        questions
      });
    }

    chapters.push({
      id: chapterId,
      title: topicsMeta.chapter.title,
      summary: toArray(topicsMeta.chapter.summary),
      topics
    });
  }

  const payload = { chapters };
  const json = JSON.stringify(payload);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, "window.QUIZ_DB = " + json + ";\n", "utf8");

  const nTopics = chapters.reduce((s, c) => s + c.topics.length, 0);
  const nQuestions = chapters.reduce(
    (s, c) => s + c.topics.reduce((t, x) => t + x.questions.length, 0),
    0
  );
  console.log(`\nĐã ghi ${OUT}`);
  console.log(`  ${chapters.length} chương · ${nTopics} topic · ${nQuestions} câu hỏi`);
}

main().catch((err) => {
  console.error("LỖI:", err.message);
  process.exit(1);
});
