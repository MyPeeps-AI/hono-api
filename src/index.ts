import { Ai} from '@cloudflare/ai'
import { Hono } from 'hono'

export interface Bindings {
	MY_NAME: string
	AI: any
	MYPEEPS_KV: KVNamespace
}

const LLMmodel: string = '@cf/meta/llama-3-8b-instruct'

const app = new Hono<{Bindings: Bindings}>()

app.get("/peeps/:id/chat", async c => {
	const ai = new Ai(c.env.AI)
	const saveInfo = (key, data) => c.env.MYPEEPS_KV.put(key, data);
	const getInfo = key => c.env.MYPEEPS_KV.get(key);
	const peepId = c.req.param('id')
	const humanIP = c.req.header('CF-Connecting-IP') || 'GUEST';
	const humanInput = c.req.query("message")
	const characterKey = `${peepId}Character`
	const historyKey = `${peepId}History_${humanIP}`


	const storedPeep = await getInfo(characterKey)

	if (!storedPeep) {
		return c.json({Error: true, message:'Unknown Peep Id'})
	}

	const storedHistory = await getInfo(historyKey)
	let messageHistory  = []

	if (storedHistory) {
		messageHistory = JSON.parse(storedHistory)
		console.log(storedHistory, messageHistory)
	}
	let systemMessages = []
	const myPeep = JSON.parse(storedPeep)
	if (myPeep.personalityDescription) {
		systemMessages.push({role: 'system', content: myPeep.personalityDescription})
	}
	if (myPeep.contextDescription) {
		systemMessages.push({role: 'system', content: myPeep.contextDescription})
	}
	messageHistory.push({role: 'user', content: humanInput})

	let messages = systemMessages.concat(messageHistory)
	const inputs = { messages }

	const response = await ai.run(LLMmodel, inputs)
	messageHistory.push({role:'ai', content:response.response})
	await saveInfo(historyKey,JSON.stringify(messageHistory))
	const result = { inputs,messageHistory,systemMessages,response: response.response }

	return c.json(result)
})

app.get("/", async c => {
	const routes = [
		{name: '/chat', parameter: ['message']},
	]

	/* write value */
	await c.env.MYPEEPS_KV.put('name', c.env.MY_NAME)
	/* read value */
	const name = await c.env.MYPEEPS_KV.get('name')
	return c.json(name)

})

// creates/ updates character persistence
app.post('/peeps/:id', async c => {
	const saveInfo = (key, data) => c.env.MYPEEPS_KV.put(key, data);
	const getInfo = key => c.env.MYPEEPS_KV.get(key);
	const peepId = c.req.param('id')
	const characterKey = `${peepId}Character`

	const storedPeep = await getInfo(characterKey)
	let myPeep
	if (!storedPeep) {
		// create myPeep here
		myPeep = {
			id: peepId,
			name: c.req.query('name') || '',
			contextDescription: c.req.query('contextDescription') || '',
			personalityDescription: c.req.query('personalityDescription') || '',
			temperature: c.req.query('temperature') || 0.0
		}
	} else {
		// update myPeep
		const myPeepLoaded = JSON.parse(storedPeep)
		myPeep = {
			id: peepId,
			name: c.req.query('name') || myPeepLoaded.name,
			contextDescription: c.req.query('contextDescription') || myPeepLoaded.contextDescription,
			personalityDescription: c.req.query('personalityDescription') || myPeepLoaded.personalityDescription,
			temperature: c.req.query('temperature') || myPeepLoaded.temperature
		}
	}
	// save
	await saveInfo(characterKey, JSON.stringify(myPeep))
	return c.json(myPeep)

})

export default app
