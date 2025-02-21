import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import * as pdf from 'html-pdf-node';

export class HtmlToPDF implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Html To PDF',
		name: 'htmltopdf',
		icon: 'file:htmltopdf.svg',
		group: ['transform'],
		version: 1,
		description: 'Convert HTML content to PDF',
		defaults: {
			name: 'HtmlToPDF',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'HTML Content',
				name: 'htmlContent',
				type: 'string',
				default: '',
				placeholder: 'Add your HTML Content',
				description:
					'HTML content that needs to be converted to PDF. Only html content is supported',
			},
			{
				displayName: 'Filename',
				name: 'filename',
				type: 'string',
				default: 'output.pdf',
				description: 'Name of the generated PDF file',
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		let htmlContent: string;

		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				htmlContent = this.getNodeParameter('htmlContent', itemIndex, '') as string;
				const filename = this.getNodeParameter('filename', itemIndex) as string;
				const options: pdf.Options = {
					format: 'A4',
					margin: {
						top: 10,
						right: 10,
						bottom: 10,
						left: 10,
					},
					printBackground: true,
				};
				const file: pdf.File = {
					content: htmlContent,
				};

				const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
					pdf.generatePdf(file, options, (err, buffer) => {
						if (err) reject(err);
						else resolve(buffer);
					});
				});
				returnData.push({
					json: items[itemIndex].json,
					binary: {
						data: {
							mimeType: 'application/pdf',
							data: pdfBuffer.toString('base64'),
							fileName: filename,
						},
					},
				});
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
