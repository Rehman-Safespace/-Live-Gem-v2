/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { classifyQuranPartSlot } from '../utils/monadLogic';

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  sizeMb?: number;
  isFolder: boolean;
  modifiedTime?: string;
  slot?: string | null;
  sortOrder?: number;
  parents?: string[];
  content?: string;
}

export async function fetchDriveFiles(
  accessToken: string,
  folderId: string = 'root',
  searchQuery: string = ''
): Promise<{ files: DriveItem[]; currentFolderName?: string }> {
  if (!accessToken) {
    throw new Error('Google Drive access token is required. Please sign in with Google.');
  }

  const queryParts = ["trashed = false"];
  if (folderId && folderId !== 'all') {
    queryParts.push(`'${folderId}' in parents`);
  }
  if (searchQuery.trim()) {
    const escaped = searchQuery.replace(/'/g, "\\'");
    queryParts.push(`name contains '${escaped}'`);
  }

  const q = encodeURIComponent(queryParts.join(' and '));
  const fields = encodeURIComponent('nextPageToken, files(id, name, mimeType, size, modifiedTime, parents)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&orderBy=folder,name`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Google Drive API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const rawList = data.files || [];

  const files: DriveItem[] = rawList.map((item: any) => {
    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    const szBytes = parseInt(item.size || '0', 10);
    const sizeMb = szBytes > 0 ? parseFloat((szBytes / (1024 * 1024)).toFixed(2)) : 0;
    const { slot, sortOrder } = classifyQuranPartSlot(item.name);

    return {
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      size: item.size,
      sizeMb,
      isFolder,
      modifiedTime: item.modifiedTime,
      slot,
      sortOrder,
      parents: item.parents,
    };
  });

  return { files };
}

export async function fetchDriveFileText(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  if (!accessToken) throw new Error('Google Drive access token is required.');

  // Check if it's a Google Doc (export as plain text)
  let fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  if (mimeType === 'application/vnd.google-apps.document') {
    fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
  }

  const resp = await fetch(fetchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to read file from Drive (${resp.status})`);
  }

  return await resp.text();
}

export async function createDriveFile(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = 'text/plain',
  parentFolderId: string = 'root'
): Promise<DriveItem> {
  if (!accessToken) throw new Error('Google Drive access token is required.');

  const metadata: any = {
    name: fileName,
    mimeType,
  };
  if (parentFolderId && parentFolderId !== 'root' && parentFolderId !== 'all') {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const resp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to upload to Google Drive (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const szBytes = parseInt(data.size || '0', 10);
  const sizeMb = szBytes > 0 ? parseFloat((szBytes / (1024 * 1024)).toFixed(2)) : 0;
  const { slot, sortOrder } = classifyQuranPartSlot(data.name);

  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    isFolder: false,
    modifiedTime: data.modifiedTime,
    sizeMb,
    slot,
    sortOrder,
  };
}

export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  if (!accessToken) throw new Error('Google Drive access token is required.');

  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok && resp.status !== 204 && resp.status !== 200) {
    const errText = await resp.text();
    throw new Error(`Failed to delete Google Drive file (${resp.status}): ${errText}`);
  }
}
