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

      {/* Add friend row */}
      <div className="friends-section__add-row center">
        <input
          placeholder="Enter friend code"
          value={friendCode}
          maxLength={6}
          onChange={e => onFriendCodeChange(e.target.value.toUpperCase())}
          className="friends-section__input"
        />
        <button
          type="button"
          onClick={onAddFriend}
          disabled={busy}
          className="btn-add-friend"
        >
          {busy ? '…' : 'Add'}
        </button>
      </div>

      {/* Friend group cards */}
      {friends.length === 0 ? (
        <div className="bg-icon-card center margin-top">
          <p style={{ fontSize: '2rem' }}>👥</p>
          <p className="recording-instructions margin-vertical">
            No friends yet — add one with their friend code!
          </p>
        </div>
      ) : (
        friends.map(f => (
          <div key={f.user_id} className="friend-group-card center margin-top">
            <div>
              <p className="friend-group-name">{f.full_name || f.email || 'Friend'}</p>
              <p className="friend-list-hint margin-top-half">
                Friend code: {f.friend_code ?? '—'}
              </p>
            </div>
            <div className="friend-group-card-bottom margin-top-half">
              <span style={{ fontSize: '0.8rem' }}>In your roulette pool</span>
            </div>
          </div>
        ))
      )}

      {/* Start another roulette CTA */}
      <div className="bg-icon-card center margin-top">
        <i className="fa-solid fa-plus fa-4x center" />
        <p className="recording-instructions margin-vertical">Start another roulette</p>
      </div>
    </>
  );
}