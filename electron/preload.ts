import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type DepPinApi } from '../src/app/core/dep-pin-api';

const api: DepPinApi = {
  audit: (pkg) => ipcRenderer.invoke(IpcChannel.audit, pkg),
  checkUpdates: (pkg) => ipcRenderer.invoke(IpcChannel.checkUpdates, pkg),
  copyToClipboard: (text) => ipcRenderer.invoke(IpcChannel.copyToClipboard, text),
};

contextBridge.exposeInMainWorld('depPin', api);
