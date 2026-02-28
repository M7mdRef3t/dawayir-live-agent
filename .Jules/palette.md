## 2025-02-25 - [Dynamic ARIA Labels]
**Learning:** For UI elements that change text or purpose based on state (like language toggles or dynamic labels), static ARIA labels are insufficient. Using template literals to inject state-aware text into `aria-label` ensures screen reader users always have accurate context.
**Action:** Always wrap `aria-label` values in braces `{}` and conditional logic when the component has multiple states.
