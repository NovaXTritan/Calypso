/**
 * Peer Matching Algorithm
 *
 * Calculates compatibility scores between users based on:
 * - Common pods (shared learning communities)
 * - Similar goals (using fuzzy matching)
 * - Activity patterns (streak, recent proofs)
 * - Complementary skills (learn from each other)
 */

/**
 * Calculate Jaccard similarity coefficient
 * J(A,B) = |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(setA, setB) {
  if (!setA?.length && !setB?.length) return 0
  if (!setA?.length || !setB?.length) return 0

  const a = new Set(setA.map(s => s.toLowerCase().trim()))
  const b = new Set(setB.map(s => s.toLowerCase().trim()))

  const intersection = new Set([...a].filter(x => b.has(x)))
  const union = new Set([...a, ...b])

  return intersection.size / union.size
}

/**
 * Fuzzy string matching using Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length
  const n = str2.length
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        )
      }
    }
  }

  return dp[m][n]
}

/**
 * Calculate fuzzy goal similarity
 * Accounts for partial matches like "Machine Learning" ≈ "ML"
 */
function goalSimilarity(goalsA, goalsB) {
  if (!goalsA?.length || !goalsB?.length) return 0

  const normalize = (s) => s.toLowerCase().trim()
  const normA = goalsA.map(normalize)
  const normB = goalsB.map(normalize)

  let totalSimilarity = 0
  let comparisons = 0

  for (const goalA of normA) {
    let bestMatch = 0
    for (const goalB of normB) {
      // Check for exact match
      if (goalA === goalB) {
        bestMatch = 1
        break
      }

      // Check for contains
      if (goalA.includes(goalB) || goalB.includes(goalA)) {
        bestMatch = Math.max(bestMatch, 0.8)
        continue
      }

      // Fuzzy match based on Levenshtein distance
      const maxLen = Math.max(goalA.length, goalB.length)
      const distance = levenshteinDistance(goalA, goalB)
      const similarity = 1 - (distance / maxLen)

      if (similarity > 0.6) { // Only count if reasonably similar
        bestMatch = Math.max(bestMatch, similarity * 0.7)
      }
    }
    totalSimilarity += bestMatch
    comparisons++
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0
}

/**
 * Calculate activity score based on recent engagement
 */
function activityScore(user, recentPosts) {
  let score = 0

  // Streak bonus (up to 30 points)
  const streak = user.streak || 0
  score += Math.min(streak * 3, 30)

  // Recent posts (up to 40 points)
  const postsThisWeek = recentPosts.filter(p =>
    Date.now() - p.createdAt < 7 * 24 * 60 * 60 * 1000
  ).length
  score += Math.min(postsThisWeek * 8, 40)

  // Total proofs bonus (up to 30 points)
  const totalProofs = user.totalProofs || recentPosts.length
  score += Math.min(totalProofs * 2, 30)

  return score / 100 // Normalize to 0-1
}

/**
 * Calculate complementary skills score
 * Users with some overlap but different specializations can learn from each other
 */
function complementaryScore(userA, userB) {
  const goalsA = userA.goals || []
  const goalsB = userB.goals || []

  if (!goalsA.length || !goalsB.length) return 0.5

  // Calculate overlap
  const overlap = jaccardSimilarity(goalsA, goalsB)

  // Sweet spot: 30-70% overlap is ideal (enough common ground but room to learn)
  if (overlap >= 0.3 && overlap <= 0.7) {
    return 1.0
  } else if (overlap < 0.3) {
    // Too different - some penalty but still valuable
    return 0.5 + overlap
  } else {
    // Too similar - slight penalty
    return 0.8 + (1 - overlap) * 0.2
  }
}

/**
 * Main matching function
 * Returns users sorted by compatibility score
 */
export function calculateMatches(currentUser, allUsers, allPosts) {
  if (!currentUser) return []

  // Get current user's posts
  const myPosts = allPosts.filter(p => p.author === currentUser.uid)

  return allUsers
    .filter(user => user.uid !== currentUser.uid)
    .map(user => {
      const userPosts = allPosts.filter(p => p.author === user.uid)

      // Calculate individual scores
      const podScore = jaccardSimilarity(
        currentUser.joinedPods || [],
        user.joinedPods || []
      )

      const goalScore = goalSimilarity(
        currentUser.goals || [],
        user.goals || []
      )

      const activityScoreValue = activityScore(user, userPosts)
      const complementaryValue = complementaryScore(currentUser, user)

      // Weighted combination
      const weights = {
        pods: 0.30,        // 30% - Same learning community
        goals: 0.35,       // 35% - Similar learning objectives
        activity: 0.20,    // 20% - Active engagement
        complementary: 0.15 // 15% - Can learn from each other
      }

      const totalScore =
        podScore * weights.pods +
        goalScore * weights.goals +
        activityScoreValue * weights.activity +
        complementaryValue * weights.complementary

      // Find common elements
      const commonPods = (user.joinedPods || []).filter(pod =>
        (currentUser.joinedPods || []).includes(pod)
      )

      const commonGoals = (user.goals || []).filter(goal =>
        (currentUser.goals || []).some(myGoal =>
          myGoal.toLowerCase().includes(goal.toLowerCase()) ||
          goal.toLowerCase().includes(myGoal.toLowerCase())
        )
      )

      // Recent activity count
      const recentActivity = userPosts.filter(p =>
        Date.now() - p.createdAt < 7 * 24 * 60 * 60 * 1000
      ).length

      return {
        ...user,
        matchScore: Math.round(totalScore * 100),
        scores: {
          pods: Math.round(podScore * 100),
          goals: Math.round(goalScore * 100),
          activity: Math.round(activityScoreValue * 100),
          complementary: Math.round(complementaryValue * 100)
        },
        commonPods,
        commonGoals,
        recentActivity
      }
    })
    .sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Get match explanation text
 */
export function getMatchReason(user) {
  const reasons = []

  if (user.commonPods?.length > 0) {
    reasons.push(`Same pods: ${user.commonPods.slice(0, 2).join(', ')}`)
  }

  if (user.commonGoals?.length > 0) {
    reasons.push(`Similar goals: ${user.commonGoals.slice(0, 2).join(', ')}`)
  }

  if (user.recentActivity > 3) {
    reasons.push('Very active this week')
  }

  if (user.scores?.complementary > 80) {
    reasons.push('Great for learning together')
  }

  return reasons.length > 0 ? reasons[0] : 'Potential learning partner'
}

/**
 * Get match quality label
 */
export function getMatchQuality(score) {
  if (score >= 80) return { label: 'Excellent Match', color: 'text-green-400' }
  if (score >= 60) return { label: 'Great Match', color: 'text-brand-400' }
  if (score >= 40) return { label: 'Good Match', color: 'text-yellow-400' }
  return { label: 'Potential Match', color: 'text-zinc-400' }
}
