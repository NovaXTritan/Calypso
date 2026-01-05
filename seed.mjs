// seed.mjs - FULL VERSION WITH CORRECT CONFIG
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, setDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDR4E6tl7qJTRtFDp7WcCfxjsvv0EbxWGs",
  authDomain: "cosmos-e42b5.firebaseapp.com",
  projectId: "cosmos-e42b5",
  storageBucket: "cosmos-e42b5.firebasestorage.app",  // ✅ FIXED!
  messagingSenderId: "362205108634",
  appId: "1:362205108634:web:705f279e0b722ce0514223"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('❌ Usage: node seed.mjs EMAIL PASSWORD');
    process.exit(1);
  }

  try {
    console.log('🌱 Starting Firestore seeding...\n');
    
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    console.log('✅ Signed in as:', email);
    console.log('📝 User ID:', uid, '\n');

    const now = Date.now();

    // EVENTS
    console.log('📅 Creating events...');
    await addDoc(collection(db, 'events'), {
      title: "Weekly Community Call",
      description: "Join us for our weekly sync!",
      date: now + (3 * 24 * 60 * 60 * 1000),
      duration: 60,
      attendees: [uid],
      maxAttendees: 50,
      link: "https://zoom.us/j/example",
      createdAt: now
    });
    await addDoc(collection(db, 'events'), {
      title: "AI/ML Study Group",
      description: "Deep dive into AI research papers",
      date: now + (5 * 24 * 60 * 60 * 1000),
      duration: 90,
      attendees: [],
      maxAttendees: 30,
      link: "https://meet.google.com/example",
      createdAt: now
    });
    await addDoc(collection(db, 'events'), {
      title: "Startup Pitch Practice",
      description: "Practice your pitch!",
      date: now + (7 * 24 * 60 * 60 * 1000),
      duration: 120,
      attendees: [uid],
      maxAttendees: 20,
      link: "https://zoom.us/j/pitch",
      createdAt: now
    });
    await addDoc(collection(db, 'events'), {
      title: "Code Review Session",
      description: "Past event",
      date: now - (2 * 24 * 60 * 60 * 1000),
      duration: 60,
      attendees: [uid],
      maxAttendees: 25,
      link: "https://meet.google.com/review",
      createdAt: now - (10 * 24 * 60 * 60 * 1000)
    });
    console.log('✅ Created 4 events\n');

    // JOURNAL ENTRIES
    console.log('📔 Creating journal entries...');
    const getDate = (ago) => new Date(now - ago * 864e5).toISOString().split('T')[0];
    
    for (let i = 0; i < 5; i++) {
      await addDoc(collection(db, 'journal_entries'), {
        userId: uid,
        date: getDate(i),
        mood: ['Focused','Happy','Stressed','Calm','Focused'][i],
        content: `Journal entry ${i+1} - Testing the app!`,
        tags: ['test', 'demo'],
        createdAt: now - (i * 864e5)
      });
    }
    console.log('✅ Created 5 journal entries\n');

    // POSTS
    console.log('📝 Creating posts...');
    for (let i = 0; i < 6; i++) {
      await addDoc(collection(db, 'posts'), {
        author: uid,
        threadId: 'weekly-ship-1',
        podId: ['ai-builders','web-dev'][i % 2],
        type: 'text',
        content: `Post ${i+1} - Shipped something cool!`,
        createdAt: now - (i * 864e5)
      });
    }
    console.log('✅ Created 6 posts\n');

    // DEMO USERS
    console.log('👥 Creating demo users...');
    const users = [
      { uid: 'user-alice', name: 'Alice Chen', goals: ['AI','Web Dev'], pods: ['ai-builders','web-dev'], streak: 15, proofs: 42 },
      { uid: 'user-bob', name: 'Bob Martinez', goals: ['Web Dev','Design'], pods: ['web-dev','design-system'], streak: 7, proofs: 28 },
      { uid: 'user-carol', name: 'Carol Kim', goals: ['AI','Research'], pods: ['ai-builders'], streak: 22, proofs: 65 },
      { uid: 'user-david', name: 'David Okonkwo', goals: ['Startups','SaaS'], pods: ['indie-hackers','web-dev'], streak: 30, proofs: 89 },
      { uid: 'user-emma', name: 'Emma Rodriguez', goals: ['Product','Analytics'], pods: ['web-dev','product-mgmt'], streak: 10, proofs: 35 }
    ];

    for (const u of users) {
      await setDoc(doc(db, 'users', u.uid), {
        uid: u.uid,
        email: `${u.uid}@example.com`,
        displayName: u.name,
        bio: `Demo user ${u.name}`,
        goals: u.goals,
        joinedPods: u.pods,
        streak: u.streak,
        totalProofs: u.proofs,
        createdAt: now - (30 * 864e5),
        preferences: { theme: 'dark', emailNotifications: true, publicProfile: true }
      });
    }
    console.log('✅ Created 5 demo users\n');

    console.log('🎉 Seeding completed successfully!');
    console.log('✨ Refresh your app to see the data\n');
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

seed();