interface Props {
    message: string;
    onClose: () => void;
    type?: 'success' | 'error'; // optional
  }
  
  export default function GameModal({ message, onClose, type = 'success' }: Props) {
    const isSuccess = type === 'success';
  
    return (
      <div id="profile-modal">
        <div id="profile-overlay" onClick={onClose}></div>
        <div
          id="profile-card"
          style={{
            maxWidth: '340px',
            margin: '0 auto',
            padding: '24px',
            textAlign: 'center',
            border: `2px solid ${isSuccess ? '#2ecc71' : '#e74c3c'}`,
            backgroundColor: isSuccess ? '#1e2b1e' : '#2b1e1e',
            borderRadius: '16px',
            boxShadow: '0 0 20px rgba(0,0,0,0.4)',
          }}
        >
          <h2
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    color: isSuccess ? '#2ecc71' : '#e74c3c',
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '12px',
    textAlign: 'center',
  }}
>
  <span>{isSuccess ? '💾 Success' : '❌ Error'}</span>
</h2>

          <p style={{ fontSize: '1rem', color: '#ccc', marginBottom: '20px' }}>
            {message}
          </p>
          <div className="button-row" style={{ justifyContent: 'center' }}>
            <button className="save-btn" onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }
  