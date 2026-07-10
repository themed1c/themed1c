import { useState } from 'react';
import { SOCIAL_COOLDOWN, useApp } from '../lib/store';
import {
  AccentButton, AnimatedNum, Card, CardLabel, GhostButton, Num, PageSub, PageTitle,
} from '../components/ui';
import { confirmDialog } from '../components/dialog';
import { stamp } from '../lib/time';
import type { SocialPlatform } from '../lib/types';

const PLATFORMS: [SocialPlatform, string][] = [
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
];

/** Compact number: 1200 -> 1.2K, 3400000 -> 3.4M. */
function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ flex: 1, minWidth: 96 }}>
      <CardLabel size={10} color="var(--faint)">
        {label}
      </CardLabel>
      <div style={{ marginTop: 3 }}>
        {value === null ? (
          <Num size={22} color="var(--faint)">
            {'-'}
          </Num>
        ) : value >= 1000 ? (
          <Num size={22} color="var(--text)">
            {short(value)}
          </Num>
        ) : (
          <AnimatedNum value={value} size={22} color="var(--text)" />
        )}
      </div>
    </div>
  );
}

export default function Social() {
  const app = useApp();
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [handle, setHandle] = useState('');
  const s = app.social;

  const name = platform === 'tiktok' ? 'TikTok' : 'Instagram';
  const ready = handle.trim().length > 0;
  const connect = () => {
    if (ready && !app.busy.social) void app.connectSocial(platform, handle);
  };

  const history = app.socialHistory;
  const first = history[0];
  const growth = s && first ? s.followers - first.followers : 0;

  const nextCheck = s
    ? Math.max(0, SOCIAL_COOLDOWN[s.platform] - (Date.now() - s.fetchedAt))
    : 0;
  const hoursLeft = Math.ceil(nextCheck / (60 * 60 * 1000));

  return (
    <section className="fade-up" style={{ maxWidth: 760 }}>
      <PageTitle>Accounts</PageTitle>
      <PageSub>
        Track one public account&rsquo;s numbers over time. It only ever reads, never posts, and
        checks rarely on purpose.
      </PageSub>

      {!s && (
        <Card>
          <CardLabel style={{ marginBottom: 14 }}>Connect an account</CardLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {PLATFORMS.map(([key, label]) => (
              <button
                key={key}
                className={platform === key ? undefined : 'ghost-btn'}
                onClick={() => setPlatform(key)}
                style={{
                  borderRadius: 20,
                  padding: '6px 16px',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  background: 'transparent',
                  ...(platform === key
                    ? { border: '1px solid var(--accent)', color: 'var(--accent)' }
                    : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="field"
              value={handle}
              placeholder={`Public ${name} handle, without the @`}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') connect();
              }}
              style={{ flex: 1, padding: '10px 13px', fontSize: 13.5 }}
            />
            <AccentButton disabled={!ready || app.busy.social} onClick={connect}>
              {app.busy.social ? 'Reading…' : 'Connect'}
            </AccentButton>
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--faint)', lineHeight: 1.6, marginTop: 16 }}>
            No sign-in and no key. The app reads the public profile page the same way a visitor
            would, at most once every{' '}
            <Num size={12} color="var(--faint)">
              {platform === 'tiktok' ? 2 : 12}
            </Num>{' '}
            hours. It never posts, likes, or follows, and your own account is never involved. The
            account has to be public. Available in the installed app only.
          </div>
        </Card>
      )}

      {s && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 22 }}>
              {s.avatar ? (
                <img
                  src={s.avatar}
                  alt=""
                  width={64}
                  height={64}
                  style={{ borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'var(--raised)',
                    border: '1px solid var(--border)',
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <CardLabel size={10}>{s.platform === 'tiktok' ? 'TikTok' : 'Instagram'}</CardLabel>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 3 }}>{s.displayName}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>@{s.handle}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <GhostButton
                  onClick={() => {
                    if (!app.busy.social) void app.refreshSocial();
                  }}
                >
                  {app.busy.social ? 'Reading…' : 'Check now'}
                </GhostButton>
                <button
                  className="danger-btn"
                  onClick={() => {
                    void confirmDialog({
                      title: `Stop tracking @${s.handle}?`,
                      body: 'The growth history collected so far goes with it. This cannot be undone.',
                      confirmLabel: 'Disconnect',
                      danger: true,
                    }).then((yes) => {
                      if (yes) app.disconnectSocial();
                    });
                  }}
                  style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7 }}
                >
                  Disconnect
                </button>
              </div>
            </div>

            {s.bio && (
              <div
                style={{
                  fontSize: 13.5,
                  color: 'var(--text2)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  marginBottom: 22,
                }}
              >
                {s.bio}
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Stat label="Followers" value={s.followers} />
              <Stat label={s.platform === 'tiktok' ? 'Videos' : 'Posts'} value={s.posts} />
              {s.platform === 'tiktok' ? (
                <Stat label="Likes" value={s.likes} />
              ) : (
                <Stat label="Following" value={s.following} />
              )}
            </div>
          </Card>

          <Card>
            <CardLabel style={{ marginBottom: 14 }}>Since you connected</CardLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <Num
                size={26}
                color={growth > 0 ? 'var(--trend-up)' : growth < 0 ? 'var(--trend-down)' : 'var(--muted)'}
              >
                {growth > 0 ? `+${short(growth)}` : short(growth)}
              </Num>
              <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>followers</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--faint)', lineHeight: 1.6 }}>
              Tracked across{' '}
              <Num size={12} color="var(--faint)">
                {history.length}
              </Num>{' '}
              {history.length === 1 ? 'day' : 'days'}. Last read {stamp(s.fetchedAt)}.
              {nextCheck > 0 && (
                <>
                  {' '}
                  Ready to check again in about{' '}
                  <Num size={12} color="var(--faint)">
                    {hoursLeft}
                  </Num>{' '}
                  {hoursLeft === 1 ? 'hour' : 'hours'}.
                </>
              )}
            </div>
          </Card>
        </>
      )}
    </section>
  );
}
