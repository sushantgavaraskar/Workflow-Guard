#  Workflow Guard – Conditional Automation Engine

**Workflow Guard** is a backend-heavy, logic-driven automation system that lets users define, evaluate, and execute conditional workflows using JSON rules. It serves as a custom Zapier-like engine focused entirely on backend logic and real-time automation.

---

##  Problem It Solves

Automating conditional business workflows often requires third-party tools (Zapier, n8n) which are costly, limited, or inflexible. This system allows you to define your own **custom rules and automations** in a developer-controlled environment — no vendor lock-in, full control.

---

##  Key Features

- ** Rule Engine**: Define logic using JSON-based rules via `json-logic-js`.
- ** Automation Execution**: Execute webhook actions when rules match.
- ** Scheduled Runs**: Use cron syntax to schedule rule evaluations.
- ** Execution Logging**: Log every rule evaluation and execution.
- ** Frontend Dashboard**: React UI to manage and trigger rules and view logs.

---


---

##  How It Works

1. **Create Rules**  
   - Define a rule using JSON logic in the UI (e.g., `{"==": [{"var": "status"}, "approved"]}`)
   - Add webhook actions to execute when matched
   - Optionally assign a cron schedule

2. **Trigger Rules**  
   - Manually by submitting an event and data payload
   - Or automatically using `node-cron` for scheduled rules

3. **Evaluate and Execute**  
   - Incoming data is evaluated against all rules
   - If a rule matches, its actions are executed (e.g., HTTP POST to a webhook)

4. **Logs**  
   - Each evaluation is stored in the SQLite DB with timestamp and result

---

##  Example Rule

```json
{
  "name": "Large Transaction Alert",
  "conditions": { ">": [{ "var": "amount" }, 5000] },
  "actions": [{ "type": "webhook", "url": "https://your-api.com/notify" }],
  "schedule": null
}






