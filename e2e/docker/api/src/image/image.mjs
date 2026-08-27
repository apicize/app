import { Jimp } from 'jimp'
import { FakeTokenManagement } from '../token/token.mjs'
const tokenManagment = new FakeTokenManagement()

async function rotate(ctype, body, degress) {
    const image = await Jimp.fromBuffer(body)
    const rotated = image.rotate(degress)
    const rotatedBuffer = await rotated.getBuffer(ctype)
    const viaBuffer = rotatedBuffer.toString('base64')
    return viaBuffer
}

export const imageRotateHandler = async (event) => {
    try {
        await tokenManagment.validateRequest(event, 'image')
    } catch(e) {
        return {
            statusCode: 403,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `${e}`
            })
        }
    }

    try {
        let ctype = Object.entries(event.headers).find(([name, _]) => name.toLowerCase() === 'content-type')?.[1] ?? '(None)'
        switch (ctype) {
            case 'image/jpeg':
            case 'image/png':
            case 'image/tiff':
                break
            default:
                throw new Error('Invalid image type')
        }

        let degrees
        switch (event.path) {
            case '/image/left':
                degrees = 90
                break
            case '/image/flip':
                degrees = 180
                break
            case '/image/right':
                degrees = 270
                break
            default:
                throw new Error(`Invalid command "${event.path}"`)
        }

        const body = Buffer.from(event.body, 'base64')
        const rotated = await rotate(ctype, body, degrees)

        return {
            statusCode: 200,
            body: rotated,
            isBase64Encoded: true,
            headers: {
                'Content-Type': ctype
            }
        }
    } catch (e) {
        console.error(`${e}`, event)
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `${e}`
            })
        }
    }
}