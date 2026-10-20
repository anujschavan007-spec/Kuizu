import { resolve } from 'path';
import { defineConfig, type Plugin } from 'vite';

function multiPageRewritePlugin(): Plugin {
  return {
    name: 'multi-page-rewrite-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url) return next();
        const [pathname, query] = req.url.split('?');
        const q = query ? `?${query}` : '';

        if (pathname === '/sign-in' || pathname === '/sign-in/') {
          req.url = `/sign-in/index.html${q}`;
        } else if (pathname === '/sign-up' || pathname === '/sign-up/') {
          req.url = `/sign-up/index.html${q}`;
        } else if (pathname === '/home' || pathname === '/home/') {
          req.url = `/home/index.html${q}`;
        } else if (
          pathname === '/problems' ||
          pathname === '/problems/' ||
          pathname === '/problem/qlibrary' ||
          pathname === '/problem/qlibrary/' ||
          pathname === '/problems/qlibrary' ||
          pathname === '/problems/qlibrary/' ||
          pathname === '/qlibrary' ||
          pathname === '/qlibrary/'
        ) {
          req.url = `/problems/index.html${q}`;
        } else if (pathname === '/quiz' || pathname === '/quiz/') {
          req.url = `/quiz/index.html${q}`;
        } else if (
          pathname === '/dailyquiz' ||
          pathname === '/dailyquiz/' ||
          pathname === '/daily-quiz' ||
          pathname === '/daily-quiz/' ||
          pathname === '/quiz/daily' ||
          pathname === '/quiz/daily/'
        ) {
          req.url = `/dailyquiz/index.html${q}`;
        } else if (pathname === '/battle' || pathname === '/battle/') {
          req.url = `/battle/index.html${q}`;
        } else if (
          pathname === '/problem/qlibrary/compiler/submission' ||
          pathname === '/problem/qlibrary/compiler/submission/' ||
          pathname === '/problems/qlibrary/compiler/submission' ||
          pathname === '/problems/qlibrary/compiler/submission/' ||
          pathname === '/qlibrary/compiler/submission' ||
          pathname === '/qlibrary/compiler/submission/'
        ) {
          req.url = `/problem/qlibrary/compiler/submission/index.html${q}`;
        } else if (
          pathname === '/problem/qlibrary/compiler' ||
          pathname === '/problem/qlibrary/compiler/' ||
          pathname === '/problems/qlibrary/compiler' ||
          pathname === '/problems/qlibrary/compiler/' ||
          pathname === '/problem/compiler' ||
          pathname === '/problem/compiler/' ||
          pathname === '/qlibrary/compiler' ||
          pathname === '/qlibrary/compiler/'
        ) {
          req.url = `/problem/qlibrary/compiler/index.html${q}`;
        } else if (
          pathname === '/problem/contest/arena' ||
          pathname === '/problem/contest/arena/' ||
          pathname === '/problems/contest/arena' ||
          pathname === '/problems/contest/arena/' ||
          pathname === '/contest/arena' ||
          pathname === '/contest/arena/' ||
          pathname === '/problem/contest/compiler' ||
          pathname === '/problem/contest/compiler/'
        ) {
          req.url = `/problem/contest/arena/index.html${q}`;
        } else if (
          pathname === '/problem/contest' ||
          pathname === '/problem/contest/' ||
          pathname === '/problems/contest' ||
          pathname === '/problems/contest/' ||
          pathname === '/contest' ||
          pathname === '/contest/' ||
          pathname === '/contests' ||
          pathname === '/contests/'
        ) {
          req.url = `/problem/contest/index.html${q}`;
        } else if (
          pathname === '/problem/quest' ||
          pathname === '/problem/quest/' ||
          pathname === '/problems/quest' ||
          pathname === '/problems/quest/'
        ) {
          req.url = `/problem/quest/index.html${q}`;
        } else if (
          pathname === '/problem/mainleaderboard' ||
          pathname === '/problem/mainleaderboard/' ||
          pathname === '/problems/mainleaderboard' ||
          pathname === '/problems/mainleaderboard/' ||
          pathname === '/mainleaderboard' ||
          pathname === '/mainleaderboard/' ||
          pathname === '/home/leaderboard' ||
          pathname === '/home/leaderboard/'
        ) {
          req.url = `/problem/mainleaderboard/index.html${q}`;
        } else if (
          pathname === '/problem/leaderboard' ||
          pathname === '/problem/leaderboard/' ||
          pathname === '/problems/leaderboard' ||
          pathname === '/problems/leaderboard/'
        ) {
          req.url = `/problem/leaderboard/index.html${q}`;
        } else if (
          pathname === '/badge' ||
          pathname === '/badge/' ||
          pathname === '/badges' ||
          pathname === '/badges/'
        ) {
          req.url = `/badge/index.html${q}`;
        } else if (
          pathname === '/profile' ||
          pathname === '/profile/' ||
          pathname === '/user/profile' ||
          pathname === '/user/profile/'
        ) {
          req.url = `/profile/index.html${q}`;
        } else if (
          pathname === '/settings' ||
          pathname === '/settings/' ||
          pathname === '/user/settings' ||
          pathname === '/user/settings/' ||
          pathname === '/profile/settings' ||
          pathname === '/profile/settings/'
        ) {
          req.url = `/settings/index.html${q}`;
        } else if (
          pathname === '/sso-callback' ||
          pathname === '/sso-callback/'
        ) {
          req.url = `/sso-callback/index.html${q}`;
        } else if (
          pathname === '/admin/profile' ||
          pathname === '/admin/profile/'
        ) {
          req.url = `/admin/profile/index.html${q}`;
        } else if (
          pathname === '/admin/settings' ||
          pathname === '/admin/settings/' ||
          pathname === '/admin/setting' ||
          pathname === '/admin/setting/'
        ) {
          req.url = `/admin/settings/index.html${q}`;
        } else if (
          pathname === '/admin/adminquest/createquest' ||
          pathname === '/admin/adminquest/createquest/' ||
          pathname === '/admin/quest/create' ||
          pathname === '/admin/quest/create/'
        ) {
          req.url = `/admin/adminquest/createquest/index.html${q}`;
        } else if (
          pathname === '/admin/adminquest' ||
          pathname === '/admin/adminquest/' ||
          pathname === '/admin/quests' ||
          pathname === '/admin/quests/'
        ) {
          req.url = `/admin/adminquest/index.html${q}`;
        } else if (
          pathname === '/admin/admincontest/createcontest' ||
          pathname === '/admin/admincontest/createcontest/' ||
          pathname === '/admin/contest/create' ||
          pathname === '/admin/contest/create/'
        ) {
          req.url = `/admin/admincontest/createcontest/index.html${q}`;
        } else if (
          pathname === '/admin/admincontest' ||
          pathname === '/admin/admincontest/' ||
          pathname === '/admin/contests' ||
          pathname === '/admin/contests/'
        ) {
          req.url = `/admin/admincontest/index.html${q}`;
        } else if (
          pathname === '/admin/adminbattle/createbattle' ||
          pathname === '/admin/adminbattle/createbattle/' ||
          pathname === '/admin/battle/create' ||
          pathname === '/admin/battle/create/'
        ) {
          req.url = `/admin/adminbattle/createbattle/index.html${q}`;
        } else if (
          pathname === '/admin/adminbattle' ||
          pathname === '/admin/adminbattle/' ||
          pathname === '/admin/battles' ||
          pathname === '/admin/battles/'
        ) {
          req.url = `/admin/adminbattle/index.html${q}`;
        } else if (
          pathname === '/admin/createproblem' ||
          pathname === '/admin/createproblem/' ||
          pathname === '/admin/problem/create' ||
          pathname === '/admin/problem/create/'
        ) {
          req.url = `/admin/createproblem/index.html${q}`;
        } else if (
          pathname === '/admin/uploadproblem' ||
          pathname === '/admin/uploadproblem/' ||
          pathname === '/admin/problem/upload' ||
          pathname === '/admin/problem/upload/' ||
          pathname === '/uploadproblem' ||
          pathname === '/uploadproblem/'
        ) {
          req.url = `/admin/uploadproblem/index.html${q}`;
        } else if (
          pathname === '/admin/createquiz' ||
          pathname === '/admin/createquiz/' ||
          pathname === '/admin/quiz/create' ||
          pathname === '/admin/quiz/create/'
        ) {
          req.url = `/admin/createquiz/index.html${q}`;
        } else if (
          pathname === '/admin/uploadquiz' ||
          pathname === '/admin/uploadquiz/' ||
          pathname === '/admin/quiz/upload' ||
          pathname === '/admin/quiz/upload/' ||
          pathname === '/admin/quiz' ||
          pathname === '/admin/quiz/'
        ) {
          req.url = `/admin/uploadquiz/index.html${q}`;
        } else if (
          pathname === '/admin/daily-kuizu/createkuizu' ||
          pathname === '/admin/daily-kuizu/createkuizu/' ||
          pathname === '/admin/dailykuizu/createkuizu' ||
          pathname === '/admin/dailykuizu/createkuizu/'
        ) {
          req.url = `/admin/dailykuizu/createkuizu/index.html${q}`;
        } else if (
          pathname === '/admin/dailykuizu' ||
          pathname === '/admin/dailykuizu/' ||
          pathname === '/admin/daily-kuizu' ||
          pathname === '/admin/daily-kuizu/' ||
          pathname === '/admin/daily-quiz' ||
          pathname === '/admin/daily-quiz/'
        ) {
          req.url = `/admin/dailykuizu/index.html${q}`;
        } else if (
          pathname === '/admin/user/userprofile' ||
          pathname === '/admin/user/userprofile/' ||
          pathname === '/admin/user/profile' ||
          pathname === '/admin/user/profile/' ||
          pathname === '/admin/userprofile' ||
          pathname === '/admin/userprofile/'
        ) {
          req.url = `/admin/user/userprofile/index.html${q}`;
        } else if (
          pathname === '/admin/user' ||
          pathname === '/admin/user/' ||
          pathname === '/admin/users' ||
          pathname === '/admin/users/'
        ) {
          req.url = `/admin/user/index.html${q}`;
        } else if (
          pathname === '/admin' ||
          pathname === '/admin/'
        ) {
          req.url = `/admin/index.html${q}`;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [multiPageRewritePlugin()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        signin: resolve(import.meta.dirname, 'sign-in/index.html'),
        signup: resolve(import.meta.dirname, 'sign-up/index.html'),
        ssocallback: resolve(import.meta.dirname, 'sso-callback/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
        adminUser: resolve(import.meta.dirname, 'admin/user/index.html'),
        adminUserProfile: resolve(import.meta.dirname, 'admin/user/userprofile/index.html'),
        adminUploadQuiz: resolve(import.meta.dirname, 'admin/uploadquiz/index.html'),
        adminDailyKuizu: resolve(import.meta.dirname, 'admin/dailykuizu/index.html'),
        adminCreateDailyKuizu: resolve(import.meta.dirname, 'admin/dailykuizu/createkuizu/index.html'),
        adminCreateQuiz: resolve(import.meta.dirname, 'admin/createquiz/index.html'),
        adminUploadProblem: resolve(import.meta.dirname, 'admin/uploadproblem/index.html'),
        adminCreateProblem: resolve(import.meta.dirname, 'admin/createproblem/index.html'),
        adminBattle: resolve(import.meta.dirname, 'admin/adminbattle/index.html'),
        adminCreateBattle: resolve(import.meta.dirname, 'admin/adminbattle/createbattle/index.html'),
        adminContest: resolve(import.meta.dirname, 'admin/admincontest/index.html'),
        adminCreateContest: resolve(import.meta.dirname, 'admin/admincontest/createcontest/index.html'),
        adminQuest: resolve(import.meta.dirname, 'admin/adminquest/index.html'),
        adminCreateQuest: resolve(import.meta.dirname, 'admin/adminquest/createquest/index.html'),
        adminSettings: resolve(import.meta.dirname, 'admin/settings/index.html'),
        adminProfile: resolve(import.meta.dirname, 'admin/profile/index.html'),
        home: resolve(import.meta.dirname, 'home/index.html'),
        problems: resolve(import.meta.dirname, 'problems/index.html'),
        problemQlibraryCompiler: resolve(import.meta.dirname, 'problem/qlibrary/compiler/index.html'),
        problemCompilerSubmission: resolve(import.meta.dirname, 'problem/qlibrary/compiler/submission/index.html'),
        quiz: resolve(import.meta.dirname, 'quiz/index.html'),
        dailyquiz: resolve(import.meta.dirname, 'dailyquiz/index.html'),
        battle: resolve(import.meta.dirname, 'battle/index.html'),
        contest: resolve(import.meta.dirname, 'problem/contest/index.html'),
        contestArena: resolve(import.meta.dirname, 'problem/contest/arena/index.html'),
        quest: resolve(import.meta.dirname, 'problem/quest/index.html'),
        leaderboard: resolve(import.meta.dirname, 'problem/leaderboard/index.html'),
        mainleaderboard: resolve(import.meta.dirname, 'problem/mainleaderboard/index.html'),
        settings: resolve(import.meta.dirname, 'settings/index.html'),
        profile: resolve(import.meta.dirname, 'profile/index.html'),
        badge: resolve(import.meta.dirname, 'badge/index.html')
      }
    }
  }
});
