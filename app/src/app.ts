import { KioskApp } from "../kioskapplib/kioskapp";
import { nothing, unsafeCSS } from "lit";
import { html, literal } from "lit/static-html.js";
import {provide} from '@lit-labs/context'
import { property, state } from "lit/decorators.js";
import "./hm-component.ts"

// import local_css from "/src/static/logviewerapp.sass?inline";
// @ts-ignore
import local_css from "./styles/component-hmlab.sass?inline";
import { ApiLocusRelationsParameter } from "./lib/hmlabtypes";
import { handleCommonFetchErrors } from "./lib/applib";
import { FetchException } from "../kioskapplib/kioskapi";
import { api2HmNodes, ApiResultLocusRelations } from "./lib/api2hmnodeshelper";
import { hmNode } from "./lib/hm";

export class HmLabApp extends KioskApp {
    static styles = unsafeCSS(local_css);
    _messages: { [key: string]: object } = {};

    static properties = {
        ...super.properties,
    };

    // noinspection JSUnresolvedReference

    // @provide({context: constantsContext})
    @state()
    relations: Array<hmNode> = []

    constructor() {
        super();
    }

    firstUpdated(_changedProperties: any) {
        console.log("App first updated.");
        super.firstUpdated(_changedProperties);
    }

    apiConnected() {
        console.log("api is connected");
        // this.fetchConstants();
    }

    protected reloadClicked(e: Event) {
        // let el = this.shadowRoot.getElementById("workstation-list")
        // el.shadowRoot.dispatchEvent(new CustomEvent("fetch-workstations", {
        //     bubbles: true,
        //     cancelable: false,
        // }))
        this.requestUpdate();
    }

    protected loadMatrix(obj: ApiLocusRelationsParameter) {
        this.showProgress = true
        const urlSearchParams = new URLSearchParams();
        urlSearchParams.append("record_type", obj.record_type);
        urlSearchParams.append("identifier", obj.identifier);

        this.apiContext.fetchFromApi(
            "locusrelations",
            "relations",
            {
                method: "GET",
                caller: "app.fetchConstants",
            },
            "v1",
            urlSearchParams)
            .then((json: object) => {
                console.log("relations fetched");
                this.showProgress = false
                this.relations = [...api2HmNodes(json as ApiResultLocusRelations)]
                console.log(`relations fetched for ${obj.identifier}:`, this.relations)
            })
            .catch((e: FetchException) => {
                this.showProgress = false
                // handleFetchError(msg)
                handleCommonFetchErrors(this, e, "loadConstants", null);
            });    }



    private loadShortcut(event: MouseEvent) {
        const cell = <HTMLDivElement>event.currentTarget
        const identifier = cell.getAttribute("data-identifier")
        const tableName = cell.getAttribute("data-table-name")


        this.loadMatrix(
            {
                record_type: tableName,
                identifier: identifier
            }
        );
    }

    updated(_changedProperties: any) {
        super.updated(_changedProperties);
        console.log("updated: ", _changedProperties)
        if (_changedProperties.has("relations")) {
            if (this.apiContext) {
                const hm = this.renderRoot.querySelector("#hm")
                // @ts-ignore
                hm.hmNodes = this.relations
            }
        }
    }


    renderMatrix() {
        return html`
            <hm-component id="hm"></hm-component>
        `
    }

    protected renderToolbar() {
        return html`
            <div class="toolbar">
                <div id="toolbar-left">
                </div>
                <div id="toolbar-buttons">
                    <div style="display:none" class="toolbar-button" @click="${this.reloadClicked}">
                        <i class="fas fa-window-restore"></i>
                    </div>
                    <div class="toolbar-button" @click="${this.reloadClicked}">
                        <i class="fas fa-reload"></i>
                    </div>
                </div>
                <div></div>
            </div>`;
    }

    // apiRender is only called once the api is connected.
    apiRender() {
        let dev = html``;
        // @ts-ignore
        if (import.meta.env.DEV) {
            dev = html`
                <div>
                    <div class="logged-in-message">logged in! Api is at ${this.apiContext.getApiUrl()}</div>
                    <div class="dev-tool-bar"><label>Open identifier:</label>
                        <span class="dev-open-identifier"
                              data-identifier="FA"
                              data-table-name="unit"
                              @click="${this.loadShortcut}">FA</span>
                        <span class="dev-open-identifier"
                              data-identifier="FA-056"
                              data-table-name="locus"
                              @click="${this.loadShortcut}">FA-056</span>
                        <label for="identifier">unit:</label><input class="dev-open-identifier-input" id="devIdentifier" name="devIdentifier" type="text"/>
                        <button id="btGoto" @click="${this.loadShortcut}">Go</button>
                    </div>
                </div>`;
        }
        let toolbar = this.renderToolbar();
        const app = html`${this.renderMatrix()}`
        return html`${dev}${toolbar}${app}`;
    }
}

window.customElements.define("hmlab-app", HmLabApp);
