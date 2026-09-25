// ==UserScript==
// @name         TNUA Homework List Sync
// @namespace    https://hung970127.github.io/tnua-homewok--list/
// @version      2.0.0
// @description  在北藝大新藝學園自動同步作業至 TNUA Homework List
// @author       TNUA Homework List
// @match        https://eclass.tnua.edu.tw/*
// @grant        none
// ==/UserScript==

(() => {
  if (document.getElementById('tnuaHomeworkSyncBox')) return;

  const HOMEWORK_LIST_URL =
    'https://hung970127.github.io/tnua-homewok--list/';

  const box = document.createElement('div');

  box.id = 'tnuaHomeworkSyncBox';

  Object.assign(box.style, {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    zIndex: '2147483647',
    background: 'white',
    padding: '20px 24px',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    color: '#111',
    minWidth: '260px'
  });

  box.innerHTML = `
    <div style="
      font-size:18px;
      font-weight:700;
      margin-bottom:6px;
    ">
      TNUA Homework List
    </div>

    <div id="tnuaSyncStatus" style="
      font-size:14px;
      color:#777;
      margin-bottom:14px;
    ">
      準備同步新藝學園作業
    </div>

    <button id="tnuaSyncButton" style="
      width:100%;
      border:0;
      border-radius:10px;
      padding:10px 16px;
      background:#111;
      color:white;
      font-size:14px;
      font-weight:600;
      cursor:pointer;
    ">
      同步作業
    </button>
  `;

  document.body.appendChild(box);

  const button = document.getElementById('tnuaSyncButton');
  const status = document.getElementById('tnuaSyncStatus');

  button.addEventListener('click', async () => {

    button.disabled = true;
    button.textContent = '同步中…';
    button.style.opacity = '0.6';

    status.textContent = '正在讀取課程與作業…';

    try {

      const courses = [...document.querySelectorAll('a[href*="/course/"]')]
        .map(a => {

          const match =
            a.getAttribute('href')?.match(/\/course\/(\d+)/);

          if (!match) return null;

          return {
            id: match[1],
            name: a.textContent.trim()
          };

        })
        .filter(Boolean);

      const uniqueCourses = [
        ...new Map(
          courses.map(course => [course.id, course])
        ).values()
      ];

      const homeworks = [];

      for (const course of uniqueCourses) {

        try {

          const response = await fetch(
            `/course/homeworkList/${course.id}`
          );

          const html = await response.text();

          const doc =
            new DOMParser().parseFromString(
              html,
              'text/html'
            );

          const rows =
            doc.querySelectorAll(
              '#homeworkListTable tbody tr'
            );

          rows.forEach(row => {

            const link =
              row.querySelector(
                'a[href*="/course/homework/"]'
              );

            if (!link) return;

            const cells =
              row.querySelectorAll('td');

            const match =
              link
                .getAttribute('href')
                ?.match(
                  /\/course\/homework\/(\d+)/
                );

            if (!match) return;

            const submitted =
              !!row.querySelector('.fa-check') ||
              row.textContent.includes('已繳交');

            homeworks.push({

              id: match[1],

              course: course.name,

              name: link.textContent.trim(),

              open:
                cells[4]?.textContent.trim() || '',

              deadline:
                cells[5]?.textContent.trim() || '',

              year:
                new Date().getFullYear(),

              submitted,

              url:
                `https://eclass.tnua.edu.tw/course/homework/${match[1]}`
            });

          });

        } catch (error) {

          console.error(
            `讀取 ${course.name} 失敗：`,
            error
          );

        }

      }

      status.textContent =
        `已讀取 ${homeworks.length} 個作業，正在返回 Homework List…`;

      /*
       * 將資料轉成 JSON
       */
      const json =
        JSON.stringify({
          type: 'TNUA_HOMEWORK_SYNC',
          homeworks,
          time: Date.now()
        });

      /*
       * Unicode → Base64
       */
      const encoded =
        btoa(
          unescape(
            encodeURIComponent(json)
          )
        );

      /*
       * 將資料放進 Homework List 的 URL #
       */
      const returnUrl =
        HOMEWORK_LIST_URL +
        '#sync=' +
        encodeURIComponent(encoded);

      /*
       * 自動回到 Homework List
       */
      window.location.href = returnUrl;

    } catch (error) {

      console.error(error);

      status.textContent =
        '同步失敗，請再試一次';

      button.disabled = false;

      button.style.opacity = '1';

      button.textContent =
        '重新同步';
    }

  });

})();
