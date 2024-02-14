import { KioskApp } from "../kioskapplib/kioskapp";
import { nothing, PropertyValues, unsafeCSS } from "lit";
import { html, literal } from "lit/static-html.js";
import { provide } from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
import "./hm-component";
import "kioskuicomponents"


// import { SlDropdown } from "@shoelace-style/shoelace";

// @ts-ignore
import local_css from "./styles/component-hmlab.sass?inline";
import { ApiLocusRelationsParameter } from "./lib/hmlabtypes";
import { getCSSVar, handleCommonFetchErrors } from "./lib/applib";
import { FetchException } from "../kioskapplib/kioskapi";
import { api2HmNodes, ApiResultLocusRelations } from "./lib/api2hmnodeshelper";
import { hmNode } from "./lib/hm";
import { getFACase, getAACase, getTestCase1, getTestCase2, getTestCaseStars } from "../test/data/testdata";
import { HMComponent } from "./hm-component";
import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/divider/divider.js";
import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path.js";
import { SlMenuItem } from "@shoelace-style/shoelace";
import { KioskContextSelector } from "kioskuicomponents/kioskuicomponents";
import { AnyDict, Constant, fetchConstants, getRecordTypeAliases } from "kiosktsapplib";

setBasePath("/static/sl_assets");

// noinspection CssUnresolvedCustomProperty
export class HmLabApp extends KioskApp {
    static styles = unsafeCSS(local_css);
    _messages: { [key: string]: object } = {};

    static properties = {
        ...super.properties,
    };

    private layoutOptions = {
        markContemporaries: true,
        contemporaryEdges: true,
        multiColorEdges: true,
        multiColorSelection: false,
        displayMode: "lightMode",
    };

    // noinspection JSUnresolvedReference

    // @provide({context: constantsContext})
    @state()
    relations: Array<hmNode> = [];

    @state()
    private enableZoomControls: boolean = false;

    @state()
    private moverActive: boolean = false;

    @state()
    private arrowActive: boolean = true;

    private constants: Constant[];

    @state()
    private recordTypeAliases: AnyDict = {};


    constructor() {
        super();
    }

    firstUpdated(_changedProperties: any) {
        console.log("App first updated.");
        super.firstUpdated(_changedProperties);
    }

    apiConnected() {
        console.log("api is connected");
        fetchConstants(this.apiContext)
            .then((constants) => {
                this.constants = constants
                this.recordTypeAliases = getRecordTypeAliases(this.constants)
                console.log(`record type aliases fetched`,this.recordTypeAliases)
            })
            .catch((e: FetchException) => {
                this.showProgress = false
                // handleFetchError(msg)
                handleCommonFetchErrors(this, e, "loadConstants");
            });
    }

    protected reloadClicked(e: Event) {
        // let el = this.shadowRoot.getElementById("workstation-list")
        // el.shadowRoot.dispatchEvent(new CustomEvent("fetch-workstations", {
        //     bubbles: true,
        //     cancelable: false,
        // }))
        this.requestUpdate();
    }

    connectedCallback() {
        super.connectedCallback();
        this.shadowRoot.addEventListener("click", e => {
            e.stopPropagation();
            let hm = this.shadowRoot.querySelector("hm-component") as HMComponent;
            if (e.target && (<HTMLElement>e.target).id === "kiosk-app" || (<HTMLElement>e.target).id === "hm-frame")
                hm.deSelect();
        });
        this.addEventListener("click", e => {
            let hm = this.shadowRoot.querySelector("hm-component") as HMComponent;
            // if (hm && e.target && (<HTMLElement>e.target).id === "kiosk-app")
            hm.deSelect();
        });

    }

    getHMComponentStatus() {
        let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
        this.enableZoomControls = !(!hm || hm.getZoom() == 0);
    }

    protected loadMatrix(obj: ApiLocusRelationsParameter) {
        this.showProgress = true;
        const urlSearchParams = new URLSearchParams();
        urlSearchParams.append("record_type", obj.record_type);
        urlSearchParams.append("identifier", obj.identifier);
        this.clearAppErrors()
        this.apiContext.fetchFromApi(
            "locusrelations",
            "relations",
            {
                method: "GET",
                caller: "app.fetchConstants",
            },
            "v1",
            urlSearchParams)
            .then((json: ApiResultLocusRelations) => {
                this.showProgress = false;
                console.log("relations fetched", json);
                if (!json.hasOwnProperty("result") || !json.result) {
                    this.addAppError("Kiosk reported an error for your request.");
                    return;
                }
                if (!json.hasOwnProperty("relations") || json.relations.length == 0) {
                    this.addAppError("Kiosk did not come up with any stratigraphic data for your request.");
                    return;
                }
                this.relations = [...api2HmNodes(json as ApiResultLocusRelations)];
                console.log(`relations fetched for ${obj.identifier}:`, this.relations);
            })
            .catch((e: FetchException) => {
                this.showProgress = false;
                // handleFetchError(msg)
                handleCommonFetchErrors(this, e, "loadConstants", null);
            });
    }


    private loadShortcut(event: MouseEvent) {
        const cell = <HTMLDivElement>event.currentTarget;
        const identifier = cell.getAttribute("data-identifier");
        const tableName = cell.getAttribute("data-table-name");

        if (tableName === "-") {
            switch (identifier) {
                case "FA":
                    this.relations = [...getFACase()];
                    break;
                case "Test1":
                    this.relations = [...getTestCase1()];
                    break;
                case "Test2":
                    this.relations = [...getTestCase2()];
                    break;
                case "stars":
                    this.relations = [...getTestCaseStars()];
                    break;
            }
        } else {
            this.loadMatrix(
                {
                    record_type: tableName,
                    identifier: identifier,
                });
        }
    }

    private selectorClosed(e: CustomEvent) {
        if (e.detail.hasOwnProperty("identifier") && e.detail.hasOwnProperty("record_type")) {
            this.loadMatrix(
                {
                    record_type: e.detail["record_type"],
                    identifier: e.detail["identifier"],
                });
        }
        console.log(e.detail)
    }

    private goButtonClicked(event: MouseEvent) {
        // const identifier = (this.renderRoot.querySelector("#devIdentifier") as HTMLInputElement).value;
        // this.loadMatrix(
        //     {
        //         record_type: "unit",
        //         identifier: identifier,
        //     });
        const selector: KioskContextSelector = this.shadowRoot.querySelector("kiosk-context-selector") as KioskContextSelector
        selector.openDialog()

    }

    updated(_changedProperties: any) {
        super.updated(_changedProperties);
        console.log("updated: ", _changedProperties);
        if (_changedProperties.has("relations")) {
            if (this.apiContext) {
                const hm = this.renderRoot.querySelector("#hm");
                // @ts-ignore
                hm.hmNodes = this.relations;
            }
        }
    }


    setBackgroundMode(hm: HMComponent, mode: string) {

        let bgColor = mode === "darkMode" ? getCSSVar("--col-bg-body-dm") : (mode === "lightMode" ? getCSSVar("--col-bg-body") : "#ffffff");
        hm.style.setProperty("background-color", "var(--col-bg-body))");
        this.style.setProperty("background-color", bgColor);
        hm.style.setProperty("--col-bg-body", bgColor);
        if (mode === "blackWhiteMode") {
            hm.style.setProperty("--col-accent-bg-body", "#000000");
            hm.style.setProperty("--col-primary-bg-body", "#000000");
            hm.style.setProperty("--col-warning-bg-body", "#000000");
            hm.style.setProperty("--col-bg-1", "#ffffff");
            hm.style.setProperty("--col-bg-1-darker", "#000000");
            hm.style.setProperty("--col-bg-1-lighter", "#ffffff");
            hm.style.setProperty("--col-primary-bg-1", "#000000");
            hm.style.setProperty("--col-bg-att", "#000000");
            hm.style.setProperty("--col-primary-bg-att", "#ffffff");
        }
        // else {
        //     hm.style.setProperty("--hm-col-accent-bg-body", getCSSVar("--col-accent-bg-body"));
        //     hm.style.setProperty("--hm-col-primary-bg-body", getCSSVar("--col-primary-bg-body"));
        //     hm.style.setProperty("--hm-col-warning-bg-body", getCSSVar("--col-warning-bg-body"));
        //     hm.style.setProperty("--hm-col-bg-1", getCSSVar("--col-bg-1"));
        //     hm.style.setProperty("--hm-col-bg-1-darker", getCSSVar("--col-bg-1-darker"));
        //     hm.style.setProperty("--hm-col-bg-1-lighter", getCSSVar("--col-bg-1-lighter"));
        //     hm.style.setProperty("--hm-col-primary-bg-1", getCSSVar("--col-primary-bg-1"));
        //     hm.style.setProperty("--hm-col-bg-att", getCSSVar("--col-bg-att"));
        //     hm.style.setProperty("--hm-col-primary-bg-att", getCSSVar("--col-primary-bg-att"));
        // }
        ["darkMode", "lightMode", "blackWhiteMode"].forEach((m) => {
            (this.shadowRoot.querySelector(`sl-menu-item[data-option="${m}"]`) as SlMenuItem).checked = m === mode;
        });
    }

    layoutItemSelected(event: CustomEvent) {
        let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
        let newOptions = { ...this.layoutOptions };

        switch (event.detail.item.dataset.option) {
            case "multiColorEdges":
                newOptions.multiColorEdges = event.detail.item.checked;
                hm.layout = newOptions;
                break;
            case "multiColorSelection":
                newOptions.multiColorSelection = event.detail.item.checked;
                hm.layout = newOptions;
                break;
            case "darkMode":
            case "lightMode":
            case "blackWhiteMode":
                this.setBackgroundMode(hm, event.detail.item.dataset.option);
                newOptions.displayMode = event.detail.item.dataset.option;
                hm.layout = newOptions;
                break;

        }
        this.layoutOptions = newOptions;
    }

    zoomIn(e: MouseEvent) {
        let element = e.currentTarget as HTMLElement;
        if (!element.classList.contains("disabled")) {
            let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
            hm.zoomIn();
        }
    }

    zoomOut(event: MouseEvent) {
        let element = event.currentTarget as HTMLElement;
        if (!element.classList.contains("disabled")) {
            let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
            hm.zoomOut();
        }
    }

    backToOriginal(event: MouseEvent) {
        let element = event.currentTarget as HTMLElement;
        if (!element.classList.contains("disabled")) {
            let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
            hm.original();
        }
    }

    zoomToFit(event: MouseEvent) {
        let element = event.currentTarget as HTMLElement;
        if (!element.classList.contains("disabled")) {
            let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
            hm.zoomToFit();
        }
    }

    activateMover(e: MouseEvent) {
        let element = e.currentTarget as HTMLElement;
        if (!element.classList.contains("disabled")) {
            if (!this.moverActive) {
                this.moverActive = true;
                this.arrowActive = false;
            }
            let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
            hm.mouseMode = 1
        }
    }

    activateArrow(e: MouseEvent) {
        let element = e.currentTarget as HTMLElement;
        if (!element.classList.contains("disabled")) {
            if (!this.arrowActive) {
                this.moverActive = false;
                this.arrowActive = true;
                let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
                hm.mouseMode = 0
            }

        }
    }

    hmUpdated(event: CustomEvent) {
        console.log("hm updated");
        this.getHMComponentStatus();
    }

    protected renderToolbar() {
        return html`
            <div class="toolbar">
                <div id="toolbar-left">
                    <sl-dropdown>
                        <sl-button class="sl-bt-toolbar" size="small" slot="trigger" caret>layout options</sl-button>
                        <sl-menu @sl-select="${this.layoutItemSelected}">
                            <sl-menu-item data-option="multiColorEdges" type="checkbox"
                                          ?checked="${this.layoutOptions.multiColorEdges}">
                                <i class="fas text-gradient suffix-width" slot="prefix"></i>
                                multi colour edges
                            </sl-menu-item>
                            <sl-menu-item data-option="multiColorSelection" type="checkbox"
                                          ?checked="${this.layoutOptions.multiColorSelection}">
                                <i class="fas text-gradient suffix-width" slot="prefix"></i>
                                multi colour highlighting
                            </sl-menu-item>
                            <sl-divider style="--color: var(--col-bg-1);"></sl-divider>
                            <sl-menu-item data-option="darkMode" type="checkbox">
                                <span class="suffix-width" style="padding-top: 5px; display: inline-block"
                                      slot="prefix">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                         style="fill: rgba(0, 0, 0, 1);transform: ;msFilter:;"><path
                                        d="M20 4H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h4l-1.8 2.4 1.6 1.2 2.7-3.6h3l2.7 3.6 1.6-1.2L16 18h4c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zM5 13h4v2H5v-2z"></path></svg>
                                </span>
                                dark background
                            </sl-menu-item>
                            <sl-menu-item data-option="lightMode" type="checkbox" checked>
                                <span class="suffix-width" style="padding-top: 5px; display: inline-block"
                                      slot="prefix">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                         style="fill: rgba(0, 0, 0, 1);transform: ;msFilter:;"><path
                                        d="M20 3H4c-1.103 0-2 .897-2 2v11c0 1.103.897 2 2 2h4l-1.8 2.4 1.6 1.2 2.7-3.6h3l2.7 3.6 1.6-1.2L16 18h4c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zM4 16V5h16l.001 11H4z"></path><path
                                        d="M6 12h4v2H6z"></path></svg>
                                </span>
                                light background
                            </sl-menu-item>
                            <sl-menu-item data-option="blackWhiteMode" type="checkbox">
                                <i class="fas suffix-width" slot="prefix"></i>
                                black and white only
                            </sl-menu-item>
                        </sl-menu>
                    </sl-dropdown>
                </div>
                <div class="toolbar-buttons">
                    <div
                        class="toolbar-button ${!this.enableZoomControls ? `disabled` : (this.arrowActive ? `selected` : "")}"
                        @click="${this.activateArrow}">
                        <i class="fa-regular"></i>
                    </div>
                    <div
                        class="toolbar-button ${!this.enableZoomControls ? `disabled` : (this.moverActive ? `selected` : "")}"
                        @click="${this.activateMover}">
                        <i class="fas"></i>
                    </div>
                </div>
                <div class="toolbar-buttons">
                    <div class="toolbar-button ${!this.enableZoomControls ? `disabled` : ""}" @click="${this.zoomIn}">
                        <i class="fas fa-magnifying-glass-plus"></i>
                    </div>
                    <div class="toolbar-button ${!this.enableZoomControls ? `disabled` : ""}" @click="${this.zoomOut}">
                        <i class="fas fa-magnifying-glass-minus"></i>
                    </div>
                    <div class="toolbar-button ${!this.enableZoomControls ? `disabled` : ""}"
                         @click="${this.zoomToFit}">
                        <i class="fas fa-compress"></i>
                    </div>
                    <div class="toolbar-button ${!this.enableZoomControls ? `disabled` : ""}"
                         @click="${this.backToOriginal}">
                        <i class="fas fa-expand"></i>
                    </div>
                </div>
                <div></div>
            </div>`;
    }

    renderMatrix() {
        return html`
            <div id="hm-frame" class="hm-frame">
                <hm-component tabindex="-1" id="hm" @hm-repaint="${this.hmUpdated}"></hm-component>
            </div>
        `;
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
                              data-identifier="CC"
                              data-table-name="unit"
                              @click="${this.loadShortcut}">CC</span>
                        <span class="dev-open-identifier"
                              data-identifier="CA"
                              data-table-name="unit"
                              @click="${this.loadShortcut}">CA</span>
                        <span class="dev-open-identifier"
                              data-identifier="FA"
                              data-table-name="unit"
                              @click="${this.loadShortcut}">FA</span>
                        <span class="dev-open-identifier"
                              data-identifier="FA"
                              data-table-name="-"
                              @click="${this.loadShortcut}">FA offline</span>
                        <span class="dev-open-identifier"
                              data-identifier="Test1"
                              data-table-name="-"
                              @click="${this.loadShortcut}">Test1</span>
                        <span class="dev-open-identifier"
                              data-identifier="Test2"
                              data-table-name="-"
                              @click="${this.loadShortcut}">Test2</span>
                        <span class="dev-open-identifier"
                              data-identifier="stars"
                              data-table-name="-"
                              @click="${this.loadShortcut}">stars</span>
                        <!--
                        <label for="identifier">unit:</label><input class="dev-open-identifier-input" id="devIdentifier"
                                                                    name="devIdentifier" type="text" />
                                                                    -->
                        <div id="btGoto" class="toolbar-button light-background" @click="${this.goButtonClicked}">
                            <i class="fas fa-circle-plus"></i>
                        </div>
                        <kiosk-context-selector 
                            .apiContext="${this.apiContext}"
                            @closeSelection="${this.selectorClosed}">
                        </kiosk-context-selector>
                        <div class="uicomponent-version">
                            plugin v${html`${(import.meta as any).env.PACKAGE_VERSION}`}
                        </div>
                    </div>
                </div>`;
        } else {
            dev = html`
                <div>
                    <div class="dev-tool-bar">
                        <div id="btGoto" class="toolbar-button" @click="${this.goButtonClicked}">
                            <i class="fas fa-circle-plus"></i>
                        </div>
                        <kiosk-context-selector
                            .apiContext="${this.apiContext}"
                            .recordTypeAliases="${this.recordTypeAliases}"
                            .recordTypeFilter="${['unit','locus']}"
                            @closeSelection="${this.selectorClosed}">
                        </kiosk-context-selector>
                        <div class="uicomponent-version">
                            plugin v${html`${(import.meta as any).env.PACKAGE_VERSION}`}
                        </div>
                        
                    </div>
                </div>`;
        }
        let toolbar = this.renderToolbar();
        const app = html`${this.renderMatrix()}`;
        return html`<div class="header-frame">${dev}${toolbar}</div>${app}`;
    }
}

window.customElements.define("hmlab-app", HmLabApp);
