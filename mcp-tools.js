import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

// HomeRelay MCP demo state. This is deliberately local/demo data, not a real household sync.
const today = () => new Date().toISOString().slice(0, 10);
const makeId = (prefix) => prefix + '-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);

const state = {
  tasks: [
    { id: 'sample-guest-room', title: 'Prepare the guest room', owner: 'You', category: 'Home', dueDate: today(), dueTime: '18:15', status: 'Planned', source: 'MCP demo sample' },
    { id: 'sample-flowers', title: 'Get fresh flowers for the entryway', owner: 'Ravi', category: 'Shopping', dueDate: today(), dueTime: '17:30', status: 'Planned', source: 'MCP demo sample' }
  ],
  shopping: [
    { id: 'shop-milk', name: 'Milk', purchased: false, addedBy: 'MCP demo sample' },
    { id: 'shop-bread', name: 'Wholegrain bread', purchased: false, addedBy: 'MCP demo sample' }
  ],
  pendingPlans: {},
  routineLog: []
};

const reply = (value) => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  structuredContent: value
});

export function createHomeRelayMcpServer() {
  const server = new McpServer(
    { name: 'homerelay-ai', version: '1.1.0' },
    { capabilities: { logging: {} } }
  );

  server.registerTool(
    'get_home_overview',
    {
      title: 'Get household overview',
      description: 'Read HomeRelay demo metrics for commitments, shopping items, and completed routine simulations.',
      inputSchema: {}
    },
    async () => reply({
      product: 'HomeRelay AI',
      mode: 'demo',
      totalCommitments: state.tasks.length,
      openCommitments: state.tasks.filter((t) => t.status !== 'Completed').length,
      completedCommitments: state.tasks.filter((t) => t.status === 'Completed').length,
      shoppingItemsToPickUp: state.shopping.filter((i) => !i.purchased).length,
      pendingPlans: Object.keys(state.pendingPlans).length,
      routineSimulations: state.routineLog.length,
      note: 'Demo state is held by this MCP server process; no external services or devices are connected.'
    })
  );

  server.registerTool(
    'draft_household_plan',
    {
      title: 'Draft a household plan',
      description: 'Convert a natural-language household request into a proposed plan. This rule-based demo creates a pending proposal only; call approve_household_plan after the user reviews and approves it.',
      inputSchema: {
        request: z.string().min(5).max(1000).describe('What needs to happen, in natural language.')
      }
    },
    async ({ request }) => {
      const text = request.toLowerCase();
      const guest = /guest|visitor|friends? coming|people coming|arriv/.test(text);
      const mentionsRavi = /ravi/.test(text);
      const tasks = [];
      let shoppingItems = [];

      if (guest) {
        const arrivalMatch = text.match(/(?:at|by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        let arrivalHour = 19;
        let arrivalMinute = 0;
        if (arrivalMatch) {
          arrivalHour = Number(arrivalMatch[1]);
          arrivalMinute = Number(arrivalMatch[2] || 0);
          const suffix = (arrivalMatch[3] || '').toLowerCase();
          if (suffix === 'pm' && arrivalHour < 12) arrivalHour += 12;
          if (suffix === 'am' && arrivalHour === 12) arrivalHour = 0;
        }
        const toTime = (hour, minute) => {
          const total = ((hour * 60 + minute) % 1440 + 1440) % 1440;
          return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
        };
        tasks.push({
          title: 'Pick up snacks and refreshments', owner: mentionsRavi ? 'Ravi' : 'You',
          category: 'Shopping', dueDate: today(), dueTime: toTime(arrivalHour, arrivalMinute - 60),
          note: 'Pick up refreshments before guests arrive.'
        });
        tasks.push({
          title: 'Prepare the guest room', owner: 'You', category: 'Home',
          dueDate: today(), dueTime: '18:15', note: 'Prepare fresh sheets, water, and guest essentials.'
        });
        tasks.push({
          title: 'Reset the living room', owner: 'You', category: 'Home',
          dueDate: today(), dueTime: toTime(arrivalHour, arrivalMinute - 15), note: 'Tidy the shared space before arrival.'
        });
        tasks.push({
          title: 'Guest arrival reminder', owner: 'You', category: 'Reminder',
          dueDate: today(), dueTime: toTime(arrivalHour, arrivalMinute - 30), note: 'A reminder tracked inside this demo; no external notification will be sent.'
        });
        shoppingItems = ['Snacks', 'Drinks'];
      } else {
        const taskName = request.trim().replace(/[.!?]+$/, '');
        tasks.push({
          title: taskName.length > 90 ? taskName.slice(0, 87) + '...' : taskName,
          owner: mentionsRavi ? 'Ravi' : 'You', category: /buy|shop|pick up|get /i.test(request) ? 'Shopping' : 'Home',
          dueDate: today(), dueTime: '18:00', note: 'Proposed from the request. Review before approving.'
        });
        if (/snack|drink|grocery|shopping|buy|pick up/i.test(request)) shoppingItems = ['Shopping items'];
      }

      const planId = makeId('plan');
      state.pendingPlans[planId] = {
        id: planId, request, createdAt: new Date().toISOString(),
        tasks: tasks.map((t) => ({ ...t, id: makeId('commitment'), status: 'Planned', source: 'Approved HomeRelay plan' })),
        shopping: shoppingItems,
        summary: guest ? 'Guest-arrival proposal with preparation, shopping, and a reminder.' : 'A proposal based on your household request.'
      };
      return reply({
        planId,
        status: 'awaiting_user_approval',
        summary: state.pendingPlans[planId].summary,
        actions: state.pendingPlans[planId].tasks,
        shoppingItems,
        message: 'Nothing has been added yet. Review this proposal, then call approve_household_plan with this planId.'
      });
    }
  );

  server.registerTool(
    'approve_household_plan',
    {
      title: 'Approve a household plan',
      description: 'Commit a previously drafted plan to the Promise Ledger and add its shopping items. Only call after the user explicitly approves the proposal.',
      inputSchema: { planId: z.string().min(1).describe('The planId returned by draft_household_plan.') }
    },
    async ({ planId }) => {
      const plan = state.pendingPlans[planId];
      if (!plan) return reply({ success: false, error: 'Pending plan not found. Draft a new plan first.' });
      state.tasks.unshift(...plan.tasks);
      for (const name of plan.shopping) {
        if (!state.shopping.some((item) => item.name.toLowerCase() === name.toLowerCase() && !item.purchased)) {
          state.shopping.unshift({ id: makeId('shopping'), name, purchased: false, addedBy: 'Approved HomeRelay plan' });
        }
      }
      delete state.pendingPlans[planId];
      return reply({
        success: true,
        approvedPlanId: planId,
        commitmentsAdded: plan.tasks.length,
        shoppingItemsAdded: plan.shopping,
        commitments: plan.tasks,
        message: 'The plan was approved and added to the MCP server demo state.'
      });
    }
  );

  server.registerTool(
    'list_commitments',
    {
      title: 'List Promise Ledger commitments',
      description: 'Read commitments from the HomeRelay demo ledger. Optional filters can narrow by status or owner.',
      inputSchema: {
        status: z.enum(['all', 'Planned', 'Awaiting confirmation', 'In progress', 'Completed']).optional().describe('Optional commitment status filter.'),
        owner: z.string().optional().describe('Optional owner filter, such as You, Ravi, or Family.')
      }
    },
    async ({ status, owner }) => {
      let items = state.tasks.slice();
      if (status && status !== 'all') items = items.filter((t) => t.status === status);
      if (owner) items = items.filter((t) => t.owner.toLowerCase() === owner.toLowerCase());
      return reply({ count: items.length, commitments: items });
    }
  );

  server.registerTool(
    'confirm_commitment',
    {
      title: 'Confirm a commitment complete',
      description: 'Mark one ledger commitment complete only when the user explicitly confirms the work is done.',
      inputSchema: {
        taskId: z.string().min(1).describe('Commitment ID returned by list_commitments or approve_household_plan.'),
        confirmedByUser: z.boolean().describe('Must be true only after the user confirms completion.')
      }
    },
    async ({ taskId, confirmedByUser }) => {
      const task = state.tasks.find((item) => item.id === taskId);
      if (!task) return reply({ success: false, error: 'Commitment not found.' });
      if (!confirmedByUser) return reply({ success: false, status: task.status, message: 'No change made; explicit user confirmation is required.' });
      task.status = 'Completed';
      task.completedAt = new Date().toISOString();
      return reply({ success: true, commitment: task, message: 'Completion recorded in the HomeRelay MCP demo state.' });
    }
  );

  server.registerTool(
    'get_shopping_list',
    {
      title: 'Get shopping list',
      description: 'Read current shopping items and their purchased status from the HomeRelay MCP demo state.',
      inputSchema: {}
    },
    async () => reply({
      count: state.shopping.length,
      itemsToPickUp: state.shopping.filter((item) => !item.purchased).length,
      items: state.shopping
    })
  );

  server.registerTool(
    'simulate_routine',
    {
      title: 'Simulate a household routine',
      description: 'Run a named household routine and record its simulated steps. This does not control physical devices, send notifications, or trigger outside services.',
      inputSchema: {
        routine: z.enum(['guest', 'quiet', 'out']).describe('guest = Guest arrival; quiet = Quiet evening; out = Heading out.')
      }
    },
    async ({ routine }) => {
      const routines = {
        guest: { name: 'Guest arrival', steps: ['Quick-tidy the living room', 'Prepare guest room essentials', 'Check snacks and refreshments', 'Record a welcome reminder'] },
        quiet: { name: 'Quiet evening', steps: ['Record dim-lighting preference', 'Record quiet-hours reminder', 'Add tomorrow priority checklist'] },
        out: { name: 'Heading out', steps: ['Check keys and wallet checklist', 'Review errands', 'Record the door checklist'] }
      };
      const selected = routines[routine];
      const entry = {
        id: makeId('routine'), name: selected.name, steps: selected.steps,
        time: new Date().toISOString(), simulated: true, devicesControlled: false
      };
      state.routineLog.push(entry);
      return reply({
        success: true,
        routine: entry,
        message: selected.name + ' simulation complete. No physical devices were controlled.'
      });
    }
  );

  return server;
}
