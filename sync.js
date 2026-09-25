(async () => {
  alert('正在讀取新藝學園課程…');

  const courses = [...document.querySelectorAll('a[href*="/course/"]')]
    .map(a => {
      const match = a.getAttribute('href')?.match(/\/course\/(\d+)/);

      if (!match) return null;

      return {
        id: match[1],
        name: a.textContent.trim()
      };
    })
    .filter(Boolean);

  const uniqueCourses = [
    ...new Map(courses.map(course => [course.id, course])).values()
  ];

  console.log('找到的課程：', uniqueCourses);

  alert(`找到 ${uniqueCourses.length} 門課程`);
})();
