"use client"

interface FriendsSectionProps {
  friends: any[];
  friendCode: string;
  busy: boolean;
  onFriendCodeChange: (v: string) => void;
  onAddFriend: () => void;
}

export function FriendsSection({
  friends,
  friendCode,
  busy,
  onFriendCodeChange,
  onAddFriend,
}: FriendsSectionProps) {
  return (
    <>
      <h1 className="margin-top">Your Friends</h1>

      {/* Friend group cards — matching screenshot layout */}
      {friends.length === 0 ? (
        <div className="bg-icon-card center margin-top">
          <p style={{ fontSize: '2rem', paddingTop: '16px' }}>👥</p>
          <p className="recording-instructions margin-vertical">
            No friends yet — add one with their friend code!
          </p>
        </div>
      ) : (
        friends.map(f => (
          <div key={f.user_id} className="friend-group-card center margin-top" style={{ padding: '14px 16px' }}>
            <div>
              <p className="friend-group-name">{f.full_name || f.email || 'Friend'}&apos;s Roulette</p>
              <p className="friend-list margin-top-half">
                Friend code: {f.friend_code ?? '—'}
              </p>
            </div>
            {/* Bottom row: spin count left, Add friend button right */}
            <div className="friend-group-card-bottom margin-top-half" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', textAlign: 'center' }}>
                In your roulette pool
              </span>
              <button
                type="button"
                style={{
                  background: '#fafafa',
                  color: '#010101',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-person-circle-plus" />
                Add friend
              </button>
            </div>
          </div>
        ))
      )}

      {/* Add friend by code row */}
      <div
        className="center"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '12px',
          width: '90%',
        }}
      >
        <input
          placeholder="Enter friend code"
          value={friendCode}
          maxLength={6}
          onChange={e => onFriendCodeChange(e.target.value.toUpperCase())}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            color: '#fafafa',
            padding: '8px 12px',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            fontSize: '1rem',
            letterSpacing: '0.1em',
          }}
        />
        <button
          type="button"
          onClick={onAddFriend}
          disabled={busy}
          style={{
            background: '#A50104',
            border: 'none',
            color: '#fafafa',
            borderRadius: '8px',
            padding: '8px 20px',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? '…' : 'Add'}
        </button>
      </div>

      {/* Start another roulette CTA — matches screenshot green card with big + */}
      <div className="bg-icon-card center margin-top" style={{ padding: '24px 0' }}>
        <i className="fa-solid fa-plus fa-5x center" />
        <p className="recording-instructions margin-vertical">Start another roulette</p>
      </div>
    </>
  );
}