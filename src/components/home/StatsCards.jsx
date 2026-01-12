import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Flame, TrendingUp, Trophy } from 'lucide-react'
import Card from '../Card'
import Magnetic from '../Magnetic'

function StatsCards({ userStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      <Magnetic className="block">
        <Card title="Current Streak" className="relative overflow-hidden">
          <div
            className="absolute -inset-px rounded-2xl pointer-events-none"
            style={{ boxShadow: userStats.streak >= 7 ? '0 0 60px rgba(255,150,50,0.3)' : 'none' }}
          />
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
              userStats.streak >= 7
                ? 'bg-gradient-to-br from-orange-500 to-red-500'
                : userStats.streak >= 3
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                  : 'bg-white/10'
            }`}>
              <Flame className={`w-8 h-8 ${userStats.streak >= 3 ? 'text-white' : 'text-zinc-400'}`} />
            </div>
            <div>
              <div className="text-4xl font-bold text-white">{userStats.streak}</div>
              <div className="text-sm text-zinc-400">{userStats.streak === 1 ? 'day' : 'days'} in a row</div>
            </div>
          </div>
          {userStats.streak >= 7 && (
            <div className="mt-3 px-3 py-1.5 bg-orange-500/20 rounded-lg text-xs text-orange-300 text-center">
              You're on fire! Keep it going!
            </div>
          )}
          {userStats.streak === 0 && (
            <Link to="/pods" className="mt-3 block text-center">
              <span className="text-sm text-brand-400 hover:text-brand-300">Start your streak today →</span>
            </Link>
          )}
        </Card>
      </Magnetic>

      <Magnetic className="block">
        <Card title="This Week">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-4xl font-bold text-white">{userStats.weeklyProofs}</div>
              <div className="text-sm text-zinc-400">proofs shared</div>
            </div>
          </div>
          <Link to="/analytics" className="mt-3 block text-center">
            <span className="text-sm text-brand-400 hover:text-brand-300">View analytics →</span>
          </Link>
        </Card>
      </Magnetic>

      <Magnetic className="block">
        <Card title="Total Progress">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-glow-400 to-glow-600 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-4xl font-bold text-white">{userStats.totalProofs}</div>
              <div className="text-sm text-zinc-400">total proofs</div>
            </div>
          </div>
          <Link to="/profile" className="mt-3 block text-center">
            <span className="text-sm text-brand-400 hover:text-brand-300">View profile →</span>
          </Link>
        </Card>
      </Magnetic>
    </div>
  )
}

export default memo(StatsCards)
