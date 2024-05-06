import { Ai} from '@cloudflare/ai'
import { Hono } from 'hono'

export interface Env {
	AI: any
}

const app = new Hono<{ Bindings: Env }>()

app.get("/chat", async c => {
	const ai = new Ai(c.env.AI)
	const humanInput = c.req.query("message")

	// ToDo: use system messages to create chat history, character and context 
	const messages = [
		{role: 'system', content: 'Your are in the role of Sherlock Holmes, the fictional detective'},
		{role: 'user', content: humanInput}
	]

	const inputs = { messages }

	const response = await ai.run("@cf/mistral/mistral-7b-instruct-v0.1", inputs)
	return c.json(response)
})

export default app
