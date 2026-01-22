// Initialize pod stats - run from functions directory
// Usage: cd functions && node init-stats.js

const admin = require('firebase-admin');

// Initialize with explicit project ID
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
        let createdAt = 0;
        if (proofData.createdAt) {
          if (typeof proofData.createdAt.toMillis === 'function') {
            createdAt = proofData.createdAt.toMillis();
          } else if (typeof proofData.createdAt === 'number') {
            createdAt = proofData.createdAt;
          }
        }

        if (createdAt > oneWeekAgo) {
          podStats[podSlug].weeklyProofs++;
        }
      }
    });

    // Write stats to Firestore
    console.log('\nWriting stats to podStatsAggregated collection...\n');

    const batch = db.batch();
    let count = 0;

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
      count++;
    }

    await batch.commit();

    console.log(`\n✓ Successfully updated ${count} pod stats!`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

recalculatePodStats();
