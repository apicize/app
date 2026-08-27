import { FakeTokenManagement } from '../token/token.mjs'
import * as querystring from 'querystring'
const tokenManagment = new FakeTokenManagement()

export const issueTokenHandler = async (event) => {
    try {
        const requestParts = querystring.parse(Buffer.from(event.body, 'base64Url').toString())
        let requestScope = requestParts.scope
        if (requestScope) {
            const scopes = requestScope.split(' ')
            for (const scope of scopes) {
                if (scope.length > 0 && scope !== 'image' && scope !== 'quote' && scope !== 'calc') {
                    throw new Error(`Invalid scope "${scope}`)
                }
            }
        }
        const results = await tokenManagment.generateToken(requestScope)
        return {
            statusCode: 200,
            body: JSON.stringify(results),
            headers: {
                'Content-Type': 'application/json'
            }
        }
    } catch (e) {
        return {
            statusCode: 403,
            body: JSON.stringify({
                message: `${e}`
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        }
    }
}
