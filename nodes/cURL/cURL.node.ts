// Note: Process calling and data retrieval borrowed from:
// <https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/ExecuteCommand/ExecuteCommand.node.ts>

import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

import { exec } from 'child_process';
import { existsSync, mkdirSync, chmodSync, createWriteStream } from 'fs';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';

export interface ICurlReturnData {
	data: string;
	statusCode: number;
	statusMessage: string;
	headers: {[key: string]: (string|string[])};
	setCookie?: {[key: string]: any};
}

interface IExecReturnData {
	error?: Error;
	stdout: string;
}

async function execPromise(command: string): Promise<IExecReturnData> {
	const returnData: IExecReturnData = {
		error: undefined,
		stdout: '',
	};
	return new Promise((resolve, _reject) => {
		exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
			returnData.stdout = stdout.trim();
			if (error) {
				returnData.error = error;
			}
			resolve(returnData);
		});
	});
}

async function getCurlPath(execFunctions: IExecuteFunctions): Promise<string> {
	const folder = `${__dirname}/../../../bin/curl`;
	const path = `${folder}/${process.arch}.bin`;
	if (!existsSync(path)) {
		if (!existsSync(folder)) {
			mkdirSync(folder, { recursive: true });
		}
		const response = await execFunctions.helpers.httpRequest({
			url: `https://github.com/n-octo-n/n8n-nodes-curl/raw/static-curl/bin/curl/${process.arch}.gz`,
			encoding: 'stream',
		});
		const deflated = createWriteStream(path);
		await pipeline(response, createGunzip(), deflated);
	}
	chmodSync(path, '775');
	return path;
}

async function handleCurlResult(stdout: string): Promise<ICurlReturnData> {
	let lines = stdout.split('\n');
	let result: ICurlReturnData = {
		data: '',
		statusCode: Number(lines[0].split(' ')[1]),
		statusMessage: lines[0].split(' ').slice(2).join(' '),
		headers: {},
	};
	lines = lines.slice(1);
	for (const line of lines) {
		lines = lines.slice(1);
		if (line.trim() === '') {
			break;
		} else {
			const tokens = line.split(':');
			const name = tokens[0].trim().toLowerCase();
			const value = tokens.slice(1).join(':').trim();
			if (Array.isArray(result.headers[name])) {
				result.headers[name] = [...result.headers[name], value];
			} else
			if (result.headers[name] === undefined) {
				result.headers[name] = value;
			} else {
				result.headers[name] = [result.headers[name] as string, value];
			};
		}
	}
	if (result.headers['set-cookie']) {
		result.setCookie = { array: [], string: '', object: {} };
		for (const cookie of result.headers['set-cookie']) {
			const parts = cookie.split(';');
			const namevalue = parts[0].split('=');
			result.setCookie.object[namevalue[0]] = { value: namevalue[1] };
			result.setCookie.array = [ ...result.setCookie.array, parts[0] ];
			for (const part of parts.slice(1)) {
				const attrvalue = part.split('=');
				result.setCookie.object[namevalue[0]][attrvalue[0].toLowerCase()] = (attrvalue.length > 1 ? attrvalue[1] : true);
			}
		}
		result.setCookie.string = result.setCookie.array.join('; ');
	}
	result.data = lines.join('\n');
	return { ...result };
}

export class cURL implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'cURL',
		name: 'cURL',
		icon: 'file:curl.svg',
		group: ['transform'],
		version: 1.0,
		description: 'Makes an HTTP request by calling cURL and returns the response',
		defaults: {
			name: 'cURL',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Command line',
				name: 'cmdline',
				type: 'string',
				required: true,
				typeOptions: {
					rows: 5,
				},
				default: '',
				placeholder: '\'https://example.com\' -H \'Cookie: Yummy=1\'',
				description: 'Command line arguments to pass cURL (avoid those that alter visualization of data; only pass URL, method, login, and headers)',
			},
		],
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let items = this.getInputData();
		let cmdline: string, cmdlineLower: string;
		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				cmdline = this.getNodeParameter('cmdline', itemIndex) as string;
				cmdlineLower = cmdline.trim().toLowerCase();
				if (cmdlineLower.slice(0, 5).trim() === 'curl') {
					cmdline = cmdline.slice(0, 5);
				}
				const { error, stdout } = await execPromise(`${await getCurlPath(this)} --include ${cmdline}`);
				const curled = await handleCurlResult(stdout);
				if (error !== undefined) {
					throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
				}
				returnItems.push({
					json: { ...curled },
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems.push({
						json: { error: error.message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnItems);
	}	
}
