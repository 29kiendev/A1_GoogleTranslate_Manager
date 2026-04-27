import type { ExtensionMessage, ExtensionResponse } from '../types/message'

export function sendMessage<TData = unknown>(
  message: ExtensionMessage
): Promise<ExtensionResponse<TData>> {
  return new Promise(resolve =>
    chrome.runtime.sendMessage(message, (res: ExtensionResponse<TData>) => resolve(res))
  )
}
