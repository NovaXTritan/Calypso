import React from 'react'
import { Link } from 'react-router-dom'
import { pods, slugify } from '../podsData'
import { useForum } from '../storeForum'

export default function Pods(){
  const membership = useForum(s => s.membership)
  const join = useForum(s => s.joinPod)
  const leave = useForum(s => s.leavePod)

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Pods</h2>
      <p className="text-zinc-300 mb-6">
        Join a pod to share tiny proofs, get feedback, and keep your streaks alive.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {pods.map(name => {
          const slug = slugify(name)
          const isMember =
            membership.has?.(slug) || (membership instanceof Set && membership.has(slug))

          return (
            <div key={slug} className="glass p-5 flex flex-col">
              <div className="font-semibold text-lg">{name}</div>
              <p className="text-sm text-zinc-400 mt-1">
                Weekly ship. Share a link, image, or note as your proof of progress.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Link className="btn-ghost" to={`/pods/${slug}`}>Open forum</Link>
                {isMember ? (
                  <button
                    className="px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                    onClick={() => leave(slug)}
                  >
                    Leave
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => join(slug)}>
                    Join
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
