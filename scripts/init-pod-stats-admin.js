// Initialize pod stats using Firebase Admin SDK
// Run with: node scripts/init-pod-stats-admin.js
//
// Requires: GOOGLE_APPLICATION_CREDENTIALS environment variable
// pointing to a service account key file

const admin = require('firebase-admin');

// Initialize with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS)
admin.initializeApp({
  projectId: 'cosmos-e42b5'
});

const db = admin.firestore();

async function recalculatePodStats() {
  console.log('Starting pod stats recalculation...\n');

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users`);

    // Get all proofs
    const proofsSnapshot = await db.collection('proofs').get();
    console.log(`Found ${proofsSnapshot.size} proofs`);

    // Calculate stats
    const podStats = {};

    // Count members per pod
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      const joinedPods = userData.joinedPods || [];

      joinedPods.forEach(podSlug => {
        if (!podStats[podSlug]) {
          podStats[podSlug] = { members: 0, totalProofs: 0, weeklyProofs: 0 };
        }
        podStats[podSlug].members++;
      });
    });

    // Count proofs per pod
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    proofsSnapshot.docs.forEach(doc => {
      const proofData = doc.data();
      const podSlug = proofData.podSlug;

      if (podSlug) {
        if (!podStats[podSlug]) {
          podStats[podSlug] = { members: 0, totalProofs: 0, weeklyProofs: 0 };
        }
        podStats[podSlug].totalProofs++;

        // Check if within last week
        const createdAt = proofData.createdAt?.toMillis?.() || proofData.createdAt || 0;
        if (createdAt > oneWeekAgo) {
          podStats[podSlug].weeklyProofs++;
        }
      }
    });

    // Write stats to Firestore
    console.log('\nWriting stats to podStatsAggregated collection...\n');

    const batch = db.batch();

    for (const [podSlug, stats] of Object.entries(podStats)) {
      const docRef = db.collection('podStatsAggregated').doc(podSlug);
      batch.set(docRef, {
        podSlug,
        members: stats.members,
        totalProofs: stats.totalProofs,
        weeklyProofs: stats.weeklyProofs,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`  ${podSlug}: ${stats.members} members, ${stats.totalProofs} proofs (${stats.weeklyProofs} this week)`);
    }

    await batch.commit();

    console.log(`\nSuccessfully updated ${Object.keys(podStats).length} pod stats!`);

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

recalculatePodStats();
