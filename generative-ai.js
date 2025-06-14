// @license
// Copyright 2024 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

class GoogleGenerativeAI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models';
    }

    getGenerativeModel({ model }) {
        return new GenerativeModel(this.apiKey, model);
    }
}

class GenerativeModel {
    constructor(apiKey, model) {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateContent(request) {
        const url = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });
        return response.json();
    }

    startChat(params) {
        return new ChatSession(this, params);
    }
}

class ChatSession {
    constructor(model, { generationConfig, history = [] }) {
        this.model = model;
        this.generationConfig = generationConfig;
        this.history = history;
    }

    async sendMessage(text) {
        const request = {
            contents: [{
                parts: [{
                    text: text
                }]
            }],
            generationConfig: this.generationConfig
        };

        const result = await this.model.generateContent(request);
        
        if (result.error) {
            throw new Error(result.error.message);
        }

        // Add to history
        this.history.push(
            { role: 'user', parts: [{ text }] },
            { role: 'model', parts: [{ text: result.candidates[0].content.parts[0].text }] }
        );

        return {
            response: {
                text: () => result.candidates[0].content.parts[0].text
            }
        };
    }
} 