import bwip from "bwip-js";
import { APIGatewayProxyEvent } from "aws-lambda";

declare module "bwip-js" {
  function toBuffer(opts: bwip.ToBufferOptions): Promise<Buffer>;
}

export const handler = async (event: APIGatewayProxyEvent) => {
  const value = await bwip.toBuffer({
    bcid: "qrcode",
    text:
      event.queryStringParameters?.payload ??
      "https://giphy.com/gifs/rick-roll-gotcha-mod-miny-kFgzrTt798d2w/tile",
    height: event.queryStringParameters?.height ?? 50,
    width: event.queryStringParameters?.width ?? 50,
    paddingheight: event.queryStringParameters?.paddingheight ?? 0,
    paddingwidth: event.queryStringParameters?.paddingwidth ?? 0,
  });

  return {
    statusCode: 200,
    isBase64Encoded: true,
    body: Buffer.from(value).toString("base64"),
    headers: {
      "Content-Type": "image/png",
    },
  };
};
