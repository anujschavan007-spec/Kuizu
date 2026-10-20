import type { BattleRoom, CreateBattlePayload, BattleQuestion } from '../types';

/**
 * Kuizu Battle Service
 * Modular service layer providing mock data and REST/WebSocket backend connectivity.
 */

const USE_MOCK = true;
const API_BASE_URL = '/api/battle';

// Default mock battle question matching img6_battle_Qpage.png
export const MOCK_BATTLE_QUESTION: BattleQuestion = {
  id: 1,
  tag: 'QUESTION',
  prompt: 'Which of these are prime numbers?',
  timeLimitSeconds: 24,
  items: [
    { id: 1, value: 1, isPrime: false },
    { id: 2, value: 2, isPrime: true },
    { id: 3, value: 3, isPrime: true },
    { id: 4, value: 4, isPrime: false },
    { id: 5, value: 5, isPrime: true },
    { id: 6, value: 6, isPrime: false },
    { id: 7, value: 7, isPrime: true },
    { id: 8, value: 8, isPrime: false },
    { id: 9, value: 9, isPrime: false },
    { id: 11, value: 11, isPrime: true },
    { id: 12, value: 12, isPrime: false }
  ],
  targetPrimeIds: [2, 3, 5, 7, 11]
};

const MOCK_ACTIVE_ROOMS: BattleRoom[] = [
  {
    id: 'room-1',
    roomCode: 'KZ-4921',
    title: 'Speed Code Duel',
    topic: 'DSA & Algorithms',
    questionCount: 5,
    timePerQuestion: 24,
    status: 'waiting',
    hostId: 'usr-dev-99',
    maxPlayers: 2,
    players: [
      { id: 'usr-dev-99', name: 'Kavya_Dev', avatar: '/images/home_avatar.png', isHost: true, score: 0, ready: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'room-2',
    roomCode: 'KZ-8820',
    title: 'Python Masters Arena',
    topic: 'Python Core',
    questionCount: 10,
    timePerQuestion: 30,
    status: 'waiting',
    hostId: 'usr-dev-42',
    maxPlayers: 4,
    players: [
      { id: 'usr-dev-42', name: 'Rohan_Code', avatar: '/images/home_avatar.png', isHost: true, score: 0, ready: true },
      { id: 'usr-dev-17', name: 'Alex_G', avatar: '/images/home_avatar.png', isHost: false, score: 0, ready: true }
    ],
    createdAt: new Date().toISOString()
  }
];

export async function fetchPublicBattleRooms(): Promise<BattleRoom[]> {
  try {
    const res = await fetch('/api/battles');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.battles)) {
        return data.battles.map((b: any) => ({
          id: b.id,
          roomCode: b.roomCode,
          title: b.title,
          topic: b.topic || 'General Tech',
          questionCount: b.questionCount || 5,
          timePerQuestion: b.timePerQuestion || 24,
          status: b.status || 'waiting',
          hostId: b.hostId || 'usr-host',
          maxPlayers: b.maxPlayers || 4,
          players: Array.isArray(b.players) && b.players.length > 0 ? b.players : [
            { id: b.hostId || 'usr-host', name: b.hostName || 'Host', avatar: '/images/home_avatar.png', isHost: true, score: 0, ready: true }
          ],
          createdAt: b.createdAt || new Date().toISOString()
        }));
      }
    }
  } catch (err) {
    console.warn('Backend /api/battles unavailable:', err);
  }

  return [];
}

export async function createBattleRoom(payload: CreateBattlePayload): Promise<BattleRoom> {
  const randomCode = `KZ-${Math.floor(1000 + Math.random() * 9000)}`;
  const storedUser = localStorage.getItem('kuizu_user');
  let currentUserName = 'Anuj (You)';
  let currentUserAvatar = '/images/home_avatar.png';
  let currentUserId = 'usr_me';

  try {
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed.name) currentUserName = parsed.name;
      if (parsed.avatar) currentUserAvatar = parsed.avatar;
      if (parsed.id) currentUserId = parsed.id;
    }
  } catch {}

  try {
    const res = await fetch('/api/battles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: payload.title || 'Live Battle Room',
        topic: payload.topic,
        questionCount: payload.questionCount,
        timePerQuestion: payload.timePerQuestion,
        maxPlayers: payload.maxPlayers || 4,
        hostName: currentUserName
      })
    });

    if (res.ok) {
      const data = await res.json();
      const code = data.roomCode || randomCode;
      const maxP = data.maxPlayers || payload.maxPlayers || 4;
      return {
        id: data.id || `battle-${Date.now()}`,
        roomCode: code,
        title: payload.title || 'Live Battle Room',
        topic: payload.topic,
        questionCount: payload.questionCount,
        timePerQuestion: payload.timePerQuestion,
        status: 'waiting',
        hostId: currentUserId,
        maxPlayers: maxP,
        players: [
          {
            id: currentUserId,
            name: currentUserName,
            avatar: currentUserAvatar,
            isHost: true,
            score: 0,
            ready: true
          }
        ],
        createdAt: new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('Could not post battle to backend:', err);
  }

  return {
    id: `room-${Date.now()}`,
    roomCode: randomCode,
    title: payload.title || 'Live Battle Room',
    topic: payload.topic,
    questionCount: payload.questionCount,
    timePerQuestion: payload.timePerQuestion,
    status: 'waiting',
    hostId: currentUserId,
    maxPlayers: payload.maxPlayers || 4,
    players: [
      {
        id: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        isHost: true,
        score: 0,
        ready: true
      }
    ],
    createdAt: new Date().toISOString()
  };
}

export async function joinBattleRoom(roomCode: string): Promise<BattleRoom> {
  const cleanCode = roomCode.trim().toUpperCase();
  const storedUser = localStorage.getItem('kuizu_user');
  const storedEmail = localStorage.getItem('kuizu_user_email') || '';
  const storedName = localStorage.getItem('kuizu_user_name');
  let currentUserName = storedName || 'Student ' + Math.floor(100 + Math.random() * 900);
  let currentUserAvatar = '/images/home_avatar.png';
  let currentUserId = `usr_${Date.now()}`;

  try {
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed.name) currentUserName = parsed.name;
      if (parsed.avatar) currentUserAvatar = parsed.avatar;
      if (parsed.id) currentUserId = parsed.id;
    }
  } catch {}

  try {
    const res = await fetch(`/api/battles/${cleanCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentUserId,
        name: currentUserName,
        email: storedEmail,
        avatar: currentUserAvatar
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.battle) {
        const b = data.battle;
        return {
          id: b.id,
          roomCode: b.roomCode,
          title: b.title,
          topic: b.topic,
          questionCount: b.questionCount || 5,
          timePerQuestion: b.timePerQuestion || 24,
          status: b.status || 'waiting',
          hostId: b.hostId || 'usr-host',
          maxPlayers: b.maxPlayers || 4,
          players: Array.isArray(b.players) ? b.players : [],
          createdAt: b.createdAt || new Date().toISOString()
        };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        throw new Error(errData.error);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('full')) {
      throw err;
    }
    console.warn('Could not join room via /api/battles/join:', err);
  }

  // Fallback for valid code
  if (cleanCode.length >= 4) {
    return {
      id: `room-${Date.now()}`,
      roomCode: cleanCode,
      title: `Battle Room ${cleanCode}`,
      topic: 'Mixed General Tech',
      questionCount: 5,
      timePerQuestion: 24,
      status: 'waiting',
      hostId: 'usr-host-guest',
      maxPlayers: 4,
      players: [
        {
          id: 'usr-host-guest',
          name: 'Rival Challenger',
          avatar: '/images/home_avatar.png',
          isHost: true,
          score: 0,
          ready: true
        },
        {
          id: 'usr-me',
          name: 'Anuj (You)',
          avatar: '/images/home_avatar.png',
          isHost: false,
          score: 0,
          ready: true
        }
      ],
      createdAt: new Date().toISOString()
    };
  }

  throw new Error(`Invalid battle code: ${roomCode}`);
}

export async function fetchBattleQuestion(roomIdOrCode: string, questionIndex = 0): Promise<BattleQuestion> {
  try {
    const res = await fetch(`/api/battles/${roomIdOrCode}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.battle) {
        const b = data.battle;
        let qData = b;
        if (Array.isArray(b.questions) && b.questions.length > 0) {
          const idx = Math.min(questionIndex, b.questions.length - 1);
          qData = b.questions[idx];
        }

        const optionsList = Array.isArray(qData.options) && qData.options.length > 0 ? qData.options : (Array.isArray(b.options) ? b.options : []);
        const correctList = Array.isArray(qData.correctOptions) ? qData.correctOptions : (Array.isArray(b.correctOptions) ? b.correctOptions : []);

        if (optionsList.length > 0) {
          const items = optionsList.map((opt: any, idx: number) => {
            const letter = typeof opt === 'object' && opt.id ? opt.id : String.fromCharCode(65 + idx);
            const labelText = typeof opt === 'object' && opt.text ? opt.text : String(opt);
            const isCorrect = correctList.includes(letter);
            return {
              id: letter,
              value: letter,
              label: labelText,
              isPrime: isCorrect
            };
          });

          return {
            id: b.id,
            tag: 'QUESTION',
            prompt: qData.questionPrompt || qData.prompt || b.questionPrompt || b.title,
            timeLimitSeconds: b.timePerQuestion || 24,
            items,
            targetPrimeIds: correctList.length > 0 ? correctList : [items[0].value]
          };
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch battle question from backend:', err);
  }

  return MOCK_BATTLE_QUESTION;
}
