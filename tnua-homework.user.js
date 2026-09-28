// ==UserScript==
// @name         TNUA Homework List Sync
// @namespace    https://hung970127.github.io/tnua-homewok--list/
// @version      2.1.0
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
      TNUA Hub
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

  const button =
    document.getElementById('tnuaSyncButton');

  const status =
    document.getElementById('tnuaSyncStatus');


  /*
   * 判斷作業年份
   *
   * 支援：
   * 2027-01-15
   * 2027/01/15
   * 01-15
   * 01/15
   */
  function getYearFromDateText(text) {

    if (!text) {
      return new Date().getFullYear();
    }

    const value = text.trim();

    /*
     * 完整年份：
     * 2027-01-15
     * 2027/01/15
     */
    const fullMatch =
      value.match(
        /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/
      );

    if (fullMatch) {
      return Number(fullMatch[1]);
    }


    /*
     * 只有月日：
     * 01-15
     * 01/15
     */
    const shortMatch =
      value.match(
        /^(\d{1,2})[-/](\d{1,2})/
      );

    if (shortMatch) {

      const month =
        Number(shortMatch[1]);

      const currentDate =
        new Date();

      const currentMonth =
        currentDate.getMonth() + 1;

      const currentYear =
        currentDate.getFullYear();


      /*
       * 例如現在是 2026 年 9 月：

       * 09-30 → 2026
       * 12-20 → 2026
       * 01-15 → 2027
       * 02-20 → 2027
       * 03-10 → 2027
       */
      if (
        currentMonth >= 7 &&
        month <= 3
      ) {
        return currentYear + 1;
      }

      return currentYear;
    }


    return new Date().getFullYear();
  }


  button.addEventListener(
    'click',
    async () => {

      button.disabled = true;
      button.textContent = '同步中…';
      button.style.opacity = '0.6';

      status.textContent =
        '正在讀取課程與作業…';


      try {

        const courses =
          [...document.querySelectorAll(
            'a[href*="/course/"]'
          )]
          .map(a => {

            const match =
              a
                .getAttribute('href')
                ?.match(
                  /\/course\/(\d+)/
                );

            if (!match) return null;

            return {
              id: match[1],
              name: a.textContent.trim()
            };

          })
          .filter(Boolean);


        const uniqueCourses = [
          ...new Map(
            courses.map(
              course => [
                course.id,
                course
              ]
            )
          ).values()
        ];


        const homeworks = [];


        for (
          const course of uniqueCourses
        ) {

          try {

            const response =
              await fetch(
                `/course/homeworkList/${course.id}`
              );


            const html =
              await response.text();


            const doc =
              new DOMParser()
                .parseFromString(
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
                !!row.querySelector(
                  '.fa-check'
                ) ||
                row.textContent.includes(
                  '已繳交'
                );


              const open =
                cells[4]
                  ?.textContent
                  .trim() || '';


              const deadline =
                cells[5]
                  ?.textContent
                  .trim() || '';


              /*
               * 取得截止日期的年份
               */
              const year =
                getYearFromDateText(
                  deadline
                );


              homeworks.push({

                id:
                  match[1],

                course:
                  course.name,

                name:
                  link.textContent.trim(),

                open:
                  open,

                deadline:
                  deadline,

                year:
                  year,

                submitted:
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
          `已讀取 ${homeworks.length} 個作業，正在返回 TNUA Hub…`;


        /*
         * 將資料轉成 JSON
         */
        const json =
          JSON.stringify({
            type:
              'TNUA_HOMEWORK_SYNC',

            homeworks:
              homeworks,

            time:
              Date.now()
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
         * 將資料放進 TNUA Hub URL #
         */
        const returnUrl =
          HOMEWORK_LIST_URL +
          '#sync=' +
          encodeURIComponent(
            encoded
          );


        /*
         * 返回 TNUA Hub
         */
        window.location.href =
          returnUrl;


      } catch (error) {

        console.error(error);

        status.textContent =
          '同步失敗，請再試一次';

        button.disabled =
          false;

        button.style.opacity =
          '1';

        button.textContent =
          '重新同步';

      }

    }
  );

})();
