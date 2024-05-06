import { Ai} from '@cloudflare/ai'
import { Hono } from 'hono'

export interface Bindings {
	MY_BUCKET: R2Bucket
	MY_NAME: string
	AI: any
	MYPEEPS_KV: KVNamespace
}

const LLMmodel = '@cf/meta/llama-3-8b-instruct'
const StableDiffusionModel = '@cf/stabilityai/stable-diffusion-xl-base-1.0'

const app = new Hono<{ Bindings: Bindings }>()

app.get("/chat", async c => {
	const ai = new Ai(c.env.AI)
	const humanInput = c.req.query("message")

	// ToDo: use system messages to create chat history, character and context 
	const messages = [
		{role: 'system', content: 'Your are in the role of Sherlock Holmes, the fictional detective'},
		{role: 'user', content: humanInput}
	]

	const inputs = { messages }

	const response = await ai.run(LLMmodel, inputs)
	return c.json(response)
})

app.get("/picture", async c => {
	const ai = new Ai(c.env.AI)
	const inputs = {
		prompt: c.req.query("prompt")
	  };

	  const response = await ai.run( StableDiffusionModel, inputs);
	  return new Response(response, { headers: {'content-type': 'image/png'}});
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
app.post('/character/:id', async c => {
	const saveInfo = (key, data) => c.env.MYPEEPS_KV.put(key, data);
	const getInfo = key => c.env.MYPEEPS_KV.get(key);
	const peepId = c.req.param('id')
	const characterKey = `${peepId}Character`

	const storedPeep = await getInfo(characterKey)
	var myPeep
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
