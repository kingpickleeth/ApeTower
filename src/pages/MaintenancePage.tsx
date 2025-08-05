import './MaintenancePage.css';

export const MaintenancePage = () => {
  return (
    <div className="maintenance-container">
    <div className="wrapper">
      <h1 className="title">
        <span className="effect" data-value="Deng Defense">Deng Defense</span> is currently being worked on. Stay tuned!
      </h1>

      <div className="content-row">
        <div className="left-side">
          <div className="list-wrapper">
            <h3 className="task-title">Things To Do:</h3>
            <ul className="task-list">
              <li className="completed">Fix window alert styles</li>
              <li>Boosts for holding Dengs</li>
              <li>Create RLS policies for the Leaderboard</li>
              <li>Add delays between purchases, upgrades, and claims</li>
              <li>Update game caps for session time, $moo earned, and waves</li>
              <li>Fine tune mobile and tablet responsiveness</li>
              <li>Add new enemy types</li>
              <li>Add new tower types</li>
              <li>Improve database $moo save functions</li>
              <li>Tweak and Balance the ingame economy and difficulty</li>
              <li className="completed">Make sure Metadata is persistent</li>
              <li className="completed">Onchain Health Check</li>
              <li className="completed">Admin Dashboard</li>
              <li>True Security Audit</li>
            </ul>
          </div>
        </div>

        <div className="right-side">
          <h3 className="task-title">Submit Feedback:</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const name = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value;
              const feedback = (e.currentTarget.elements.namedItem('feedback') as HTMLTextAreaElement).value;

              const recaptchaResponse = (window as any).grecaptcha?.getResponse?.();
              if (!recaptchaResponse) {
                document.getElementById('formStatus')!.innerText = "❌ Please complete the CAPTCHA!";
                return;
              }

              try {
                await fetch("https://discord.com/api/webhooks/1401232104821493870/cAiGzksNSWwQgjwYE0NlODWx6cjLldTP6lfo9LV6UHrSLw1Kk-vhAkgUIMxPqBtrKATo", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    content: `💬 New Feedback:\n**From:** ${name}\n**Message:** ${feedback}`
                  }),
                });
                document.getElementById('formStatus')!.innerText = "✅ Feedback submitted. Thank you!";
                (e.target as HTMLFormElement).reset();
              } catch {
                document.getElementById('formStatus')!.innerText = "❌ Submission failed. Try again later.";
              }
            }}
          >
            <input name="name" placeholder="Your name" required />
            <textarea name="feedback" placeholder="Got feedback or spotted a bug? Let us know!" required />
            <div className="g-recaptcha" data-sitekey="6LfseZgrAAAAAERHoj9fVPikCTK1JZorMr3hp2fH"></div>
            <button type="submit" className="glow-button">Submit Feedback</button>
            <p id="formStatus"></p>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
};
