"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyToClipboard = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const history_1 = require("./history");
/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    try {
        // Create a temporary file
        const historyDir = (0, history_1.getHistoryDir)();
        const tempFile = path.join(historyDir, 'clipboard_temp.txt');
        fs.writeFileSync(tempFile, text);
        // Copy to clipboard based on platform
        if (process.platform === 'darwin') {
            // macOS
            (0, child_process_1.execSync)(`cat ${tempFile} | pbcopy`);
        }
        else if (process.platform === 'win32') {
            // Windows
            (0, child_process_1.execSync)(`type ${tempFile} | clip`);
        }
        else {
            // Linux (requires xclip)
            try {
                (0, child_process_1.execSync)(`cat ${tempFile} | xclip -selection clipboard`);
            }
            catch (error) {
                console.log(chalk_1.default.yellow('Could not copy to clipboard. Please install xclip or copy manually.'));
                return false;
            }
        }
        // Remove temporary file
        fs.unlinkSync(tempFile);
        return true;
    }
    catch (error) {
        console.error(chalk_1.default.red('Error copying to clipboard:'), error.message);
        return false;
    }
}
exports.copyToClipboard = copyToClipboard;
//# sourceMappingURL=clipboard.js.map