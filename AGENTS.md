<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- HiLumi game rules (ranks, streaks, quiz limits, duel points) live as pure functions in src/lib/game.ts with tests in src/test/game.test.ts — keeps rules testable and in one place.
- Student progress is saved as one JSON blob in public.profiles.progress (synced by src/lib/store.ts, debounced); AI calls go through server functions in src/lib/ai.functions.ts so the AI key stays server-side.
- Shared membership, quiz invitations, answer grading and streak advancement use authenticated database RPCs with separate cloud records; each answer is locked and graded per question by answer_streak_quiz (key revealed only for that locked question), choices live in a private table, and the live score reads shared_quiz_players over realtime.
- Quiz review history (last 10, all modes) is stored in the progress blob as quizHistory; rules in src/lib/game.ts.
- Uploaded pet SVG artwork is transformed into standalone local assets; evolution thresholds remain in the pure game rules rather than in the art.
- Voice input records a complete WAV in the browser and posts it to the signed-in-only server route /api/transcribe, which streams the AI transcript back — keeps the AI key server-side and audio decodable on every browser.
- Users imported from the previous app live in public.legacy_users (service-role only); claim_legacy_profile() RPC moves their progress and memberships to the new account only when email ownership is proven server-side (Google identity with the same email, or a session from an emailed link: JWT amr otp/magiclink/recovery) — sign-up auto-confirms emails, so email_confirmed_at proves nothing.
- Duo/group chat lives in public.streak_messages (members read, accepted members insert, realtime) and is deliberately separate from quiz/streak RPCs so chatting never advances a streak.
