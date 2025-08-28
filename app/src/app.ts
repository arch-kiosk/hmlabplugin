import { KioskApp } from "../kioskapplib/kioskapp";
import { nothing, PropertyValues, unsafeCSS } from "lit";
import { html, literal } from "lit/static-html.js";
import { provide } from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
import "./hm-component";

// @ts-ignore
import local_css from "./styles/component-hmlab.sass?inline";
import { ApiLocusRelationsParameter } from "./lib/hmlabtypes";
import { getCSSVar, handleCommonFetchErrors } from "./lib/applib";
import { FetchException } from "../kioskapplib/kioskapi";
import {
    api2HmNodes,
    apiResult2Loci,
    apiResult2Relations,
    ApiResultLocusRelations, debugApi2HmNodes, DroppedRelation, getChronType, Locus,
    LocusRelation,
} from "./lib/api2hmnodeshelper";
import { ERR_CONTRADICTION, ERR_FAULTY, ERR_NON_TEMPORAL_RELATION, HMAnalysisResult, hmNode } from "./lib/hm";
// import { getFACase, getAACase, getTestCase1, getTestCase2 } from "../test/data/testdata";
import { HMComponent } from "./hm-component";
import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/divider/divider.js";
import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path.js";
import { SlMenuItem } from "@shoelace-style/shoelace";
import { KioskContextSelector } from "@arch-kiosk/kioskuicomponents";
import { AnyDict, Constant, fetchConstants, getRecordTypeAliases } from "@arch-kiosk/kiosktsapplib";
import { sendMessage } from "./lib/appmessaging";

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
        rowStyle: "rowStyleLane", //rowStyleLane | rowStyleDashedLine | rowStyleNone
        locusTypeStyle: "label" //"label" or "" for none

    };

    // noinspection JSUnresolvedReference

    // @provide({context: constantsContext})
    @state()
    hmNodes: Array<hmNode> = [];

    @state()
    private enableZoomControls: boolean = false;

    @state()
    private moverActive: boolean = false;

    @state()
    private arrowActive: boolean = true;

    private constants: Constant[];

    @state()
    private recordTypeAliases: AnyDict = {};

    @state()
    private tags: Set<string>;

    @state()
    private selectedTag: string;

    private relations: Array<LocusRelation> = [];
    private droppedLocusRelations:Array<DroppedRelation> = [];
    private loci: Array<Locus> = [];

    @state()
    private relationsWithErrors: HMAnalysisResult = undefined;

    @state()
    private showRelationsWithErrors: boolean = true;
    private locusRelationDepth: number = 1; // depth of relations if the requested identifier is a locus (instead of a unit)
    private resizeObserver: ResizeObserver;
    private resizeObserved: number = 0


    constructor() {
        super();
        this.autoRenderProgress = false
        this.autoRenderErrors = false
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
        this.relationsWithErrors = hm.getAnalysisResults()

        if (!this.relationsWithErrors) {
            this.relationsWithErrors = {
                cycles: [],
                removed: [],
                // removedContemporaries: [],
                errors: [],
                result: true
            }
        }

        // this.droppedLocusRelations.forEach(r => {
        //     this.relationsWithErrors.removed.push([r.locusRelation.uid_locus, r.locusRelation.uid_locus_related, r.reason])
        // })

        if (this.relationsWithErrors && this.relationsWithErrors.removed.length > 0)
            this.showRelationsWithErrors = true
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
                try {
                    this.showProgress = false;
                    if (!json.hasOwnProperty("result") || !json.result) {
                        this.addAppError("Kiosk reported an error for your request.");
                        return;
                    }
                    if (!json.hasOwnProperty("relations") || json.relations.length == 0) {
                        this.addAppError("Kiosk did not come up with any stratigraphic data for your request.");
                        return;
                    }
                    try {
                        this.loci = apiResult2Loci(json as ApiResultLocusRelations)
                        console.log("locus information fetched: ", this.loci)
                    } catch (e) {
                        throw `Error when loading the locus information received from Kiosk: ${e}.`;
                    }
                    let requestedLocusUID = ""
                    if (obj.record_type === "locus") {
                        requestedLocusUID = this.loci.find(x => x.arch_context === obj.identifier).uid
                    }
                    try {
                        this.relations = apiResult2Relations(json as ApiResultLocusRelations,
                            this.loci,
                            false,
                            requestedLocusUID)
                        console.log("relations fetched: ", this.relations)
                    } catch (e) {
                        throw `Error when loading the stratigraphic information received from Kiosk: ${e}.`;
                    }
                    this.droppedLocusRelations = []
                    try {
                        this.hmNodes = [...api2HmNodes(this.relations, this.loci, this.droppedLocusRelations)];
                    } catch(e) {
                        throw `Error when processing the information received from Kiosk: ${e}.`;
                    }
                    // this.hmNodes = [...debugApi2HmNodes(this.relations, this.loci)];
                    this.tags = this.loadTags()
                    console.log("tags", this.tags)
                    console.log(`relations fetched for ${obj.identifier}:`, this.hmNodes);
                } catch (e) {
                    sendMessage(this, "Application Error",
                        `(load_matrix) ${e}.`);
                }
            })
            .catch((e: FetchException) => {
                this.showProgress = false;
                // handleFetchError(msg)
                handleCommonFetchErrors(this, e, "loadConstants", null);
            });
    }

    private loadTags() {
        const tags: Set<string> = new Set()
        if (this.hmNodes) {
            this.hmNodes.forEach((node) => {
                if (node.data.hasOwnProperty("tags")) {
                    let tagsStr = (<AnyDict>node.data)["tags"];
                    (tagsStr?tagsStr.split("#"):[]).forEach((t:string) => tags.add(t))
                }
            })
        }
        return tags
    }


    private loadShortcut(event: MouseEvent) {
        const cell = <HTMLDivElement>event.currentTarget;
        const identifier = cell.getAttribute("data-identifier");
        const tableName = cell.getAttribute("data-table-name");

        if (tableName === "-") {
            // switch (identifier) {
            //     case "FA":
            //         this.hmNodes = [...getFACase()];
            //         break;
            //     case "Test1":
            //         this.hmNodes = [...getTestCase1()];
            //         break;
            //     case "Test2":
            //         this.hmNodes = [...getTestCase2()];
            //         break;
            // }
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
        if (_changedProperties.has("hmNodes")) {
            if (this.apiContext) {
                const hm = this.renderRoot.querySelector("#hm");
                // @ts-ignore
                hm.hmNodes = this.hmNodes;
                this.resizeObserved = 0

                if (!this.resizeObserver) {
                    this.resizeObserver = new ResizeObserver(() => {
                        console.log("resize observed")
                        if (this.hmNodes && this.hmNodes.length > 0) {
                            this.resizeObserved++
                            if (this.resizeObserved == 2) {
                                setTimeout(this._repaintDueToResize.bind(this), 500)
                            }
                        }
                    })
                    this.resizeObserver.observe(this.parentElement)
                }
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
        } else {
            hm.style.setProperty("--col-accent-bg-body", null);
            hm.style.setProperty("--col-primary-bg-body", null);
            hm.style.setProperty("--col-warning-bg-body", null);
            hm.style.setProperty("--col-bg-1", null);
            hm.style.setProperty("--col-bg-1-darker", null);
            hm.style.setProperty("--col-bg-1-lighter", null);
            hm.style.setProperty("--col-primary-bg-1", null);
            hm.style.setProperty("--col-bg-att", null);
            hm.style.setProperty("--col-primary-bg-att", null);
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
            case "locusTypeStyle":
                newOptions.locusTypeStyle = event.detail.item.checked?"label":"";
                hm.layout = newOptions;
                break;
            case "darkMode":
            case "lightMode":
            case "blackWhiteMode":
                this.setBackgroundMode(hm, event.detail.item.dataset.option);
                newOptions.displayMode = event.detail.item.dataset.option;
                hm.layout = newOptions;
                break;
            case "rowStyleNone":
            case "rowStyleDashedLine":
            case "rowStyleLane":
                newOptions.rowStyle = event.detail.item.dataset.option;
                ["rowStyleNone", "rowStyleDashedLine", "rowStyleLane"].forEach((m) => {
                    (this.shadowRoot.querySelector(`sl-menu-item[data-option="${m}"]`) as SlMenuItem).checked = m === newOptions.rowStyle;
                });
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

    zoomToFitWidth(event: MouseEvent) {
        let element = event.currentTarget as HTMLElement;
        if (!element.classList.contains("disabled")) {
            let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
            hm.zoomToFit();
        }
    }

    zoomToFit(event: MouseEvent) {
        let element = event.currentTarget as HTMLElement;
        if (!element.classList.contains("disabled")) {
            let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
            hm.zoomToFit(true);
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

    toggleRelationsWithErrors(e: MouseEvent) {
        let element = e.currentTarget as HTMLElement;

        if (!element.classList.contains("disabled")) {
            this.showRelationsWithErrors = !this.showRelationsWithErrors
            let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
            hm.fullRepaint()
        }
    }

    fullRepaint(e: MouseEvent) {
        let element = e.currentTarget as HTMLElement;
        if (!element.classList.contains("disabled")) {
            let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
            hm.fullRepaint()
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

    tagSelected(e: CustomEvent) {
        let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
        let newOptions = { ...this.layoutOptions };
        const selectedTag = (<HTMLElement>e.detail.item).innerText.trim()
        if (this.selectedTag != selectedTag) {
            if (selectedTag === "unmark") {
                this.selectedTag = undefined
            } else {
                this.selectedTag = selectedTag
            }
            let el = <SlMenuItem>this.shadowRoot.querySelector(".tagMenuItem[checked]")
            if (el)
                el.checked = false
            hm.selectedTag = this.selectedTag?this.selectedTag:""
        }
    }

    hmUpdated(event: CustomEvent) {
        console.log("hm updated");
        this.getHMComponentStatus();
    }
    private _repaintDueToResize() {
        let hm: HMComponent = this.shadowRoot.querySelector("hm-component");
        hm.fullRepaint()
        this.resizeObserved = 1
    }

    protected renderTagDropdown() {
        return html`        
            <sl-dropdown>
                <sl-button class="sl-bt-toolbar" size="small" slot="trigger" caret ?disabled="${!this.tags || this.tags.size == 0}">
                    ${this.selectedTag?this.selectedTag:"mark by tag"}
                </sl-button>
                ${this.tags && this.tags.size?html`
                    <sl-menu @sl-select="${this.tagSelected}">
                        ${this.selectedTag?html`<sl-menu-item>
                            unmark                             
                        </sl-menu-item>`:nothing}
                        ${[...this.tags].map(t => html`
                            <sl-menu-item class="tagMenuItem" type="checkbox"
                                          ?checked="${t === this.selectedTag}">
                                ${t}
                            </sl-menu-item>
                        `)}
                    </sl-menu>`
                    :nothing}
            </sl-dropdown>`
    }

    protected renderToolbar() {
        const hasRelationsWithErrors = this.relationsWithErrors && this.relationsWithErrors.removed.length > 0
        const hasDroppedRelations = this.droppedLocusRelations && this.droppedLocusRelations.length > 0
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
                            <sl-menu-item data-option="locusTypeStyle" type="checkbox"
                                          ?checked="${this.layoutOptions.locusTypeStyle === 'label'}">
                                <i class="fas text-gradient suffix-width" slot="prefix"></i>
                                show types
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
                            <sl-divider style="--color: var(--col-bg-1);"></sl-divider>
                            <sl-menu-item data-option="rowStyleNone" type="checkbox">
                                <i class="fas suffix-width" slot="prefix"></i>
                                don't mark rows
                            </sl-menu-item>
                            <sl-menu-item data-option="rowStyleDashedLine" type="checkbox">
                                <i class="fas suffix-width" slot="prefix"></i>
                                mark rows with dotted lines
                            </sl-menu-item>
                            <sl-menu-item data-option="rowStyleLane" type="checkbox" checked>
                                <i class="fas suffix-width" slot="prefix"></i>
                                mark rows with background
                            </sl-menu-item>
                        </sl-menu>
                    </sl-dropdown>
                    ${this.renderTagDropdown()}
                </div>
                ${hasRelationsWithErrors || hasDroppedRelations? html` 
                    <div class="toolbar-buttons">
                    <div
                        class="toolbar-button toolbar-button-red ${(this.showRelationsWithErrors ? `selected` : "")}"
                        @click="${this.toggleRelationsWithErrors}">
                        <i class="fas"></i>
                    </div>
                </div>`:nothing}
                
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
                         @click="${this.zoomToFitWidth}">
                        <!--i class="fas fa-compress"></i-->
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:bx="https://boxy-svg.com" width="48px" viewBox="0 20 128 128">
                            <path d="m13.982 33.286-.355 61.427M115.944 33.286l-.355 61.427" style="stroke-width:6px"/>
                            <path d="M28.895 63.468h69.949" style="paint-order:fill;stroke-width:6px"/>
                            <path bx:shape="triangle 42.189 93.829 14.338 13.063 0.5 0 1@924b4f87"
                                  d="m49.358 93.829 7.169 13.063H42.189l7.169-13.063Z"
                                  style="paint-order:fill;transform-box:fill-box;transform-origin:50% 50%;stroke-width:6px"
                                  transform="rotate(-90 -26.026 -10.644)"/>
                            <path bx:shape="triangle 89.85 57.22 14.338 13.063 0.5 0 1@a7b9ae05"
                                  d="m97.019 57.22 7.169 13.063H89.85l7.169-13.063Z"
                                  style="paint-order:fill;stroke-width:6px;transform-origin:49.358px 100.361px"
                                  transform="rotate(90 48.084 -36.373)"/>
                        </svg>                        
                    </div>
                    <div class="toolbar-button ${!this.enableZoomControls ? `disabled` : ""}"
                         @click="${this.zoomToFit}">
                        <!--i class="fas fa-compress"></i-->
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:bx="https://boxy-svg.com" width="42px" viewBox="0 10 128 128">
                            <path d="m13.982 33.286-.355 61.427M115.944 33.286l-.355 61.427" style="stroke-width:6px"/>
                            <path d="M28.895 63.468h69.949" style=";paint-order:fill;stroke-width:6px"/>
                            <path bx:shape="triangle 42.189 93.829 14.338 13.063 0.5 0 1@924b4f87"
                                  d="m49.358 93.829 7.169 13.063H42.189l7.169-13.063Z"
                                  style="paint-order:fill;stroke-width:6px;transform-box:fill-box;transform-origin:50% 50%"
                                  transform="rotate(-90 -26.026 -10.644)"/>
                            <path bx:shape="triangle 89.85 57.22 14.338 13.063 0.5 0 1@a7b9ae05"
                                  d="m97.019 57.22 7.169 13.063H89.85l7.169-13.063Z"
                                  style="paint-order:fill;stroke-width:6px;transform-origin:49.358px 100.361px"
                                  transform="rotate(90 48.084 -36.373)"/>
                            <path d="M34.245 62.033H97.09"
                                  style="paint-order:fill;stroke-width:6px;transform-box:fill-box;transform-origin:50% 50%"
                                  transform="rotate(-90 0 0)"/>
                            <path bx:shape="triangle 58.657 82.711 14.338 13.063 0.5 0 1@cd9d82d6"
                                  d="m65.826 82.711 7.169 13.063H58.657l7.169-13.063Z"
                                  style="paint-order:fill;stroke-width:6px;transform-box:fill-box;transform-origin:50% 50%"
                                  transform="rotate(180)"/>
                            <path bx:shape="triangle 58.596 31.245 14.338 13.063 0.5 0 1@cccc861b"
                                  d="m65.765 31.245 7.169 13.063H58.596l7.169-13.063Z"
                                  style="paint-order:fill;stroke-width:6px;transform-origin:49.358px 100.361px"/>
                            <path d="m65.941-11.545-.355 61.427"
                                  style="stroke-width:6px;transform-box:fill-box;transform-origin:50% 50%"
                                  transform="rotate(-90 0 0)"/>
                            <path d="m65.941 76.455-.355 61.427"
                                  style="stroke-width:6px;transform-origin:65.764px 107.169px"
                                  transform="rotate(-90 0 0)"/>
                        </svg>                    </div>
                    <div class="toolbar-button ${!this.enableZoomControls ? `disabled` : ""}"
                         @click="${this.backToOriginal}">
                        <!--i class="fas fa-expand"></i-->
                        <svg xmlns="http://www.w3.org/2000/svg" width="48px" viewBox="16 20 128 128"><text x="17.888" y="78.786" style="font-family:monospace;font-size:43.3437px;white-space:pre" transform="matrix(1.25851 0 0 1.47657 -2.628 -34.285)">1:1</text></svg>                        
                    </div>
                    <div class="toolbar-button ${!this.enableZoomControls ? `disabled` : ""}"
                         @click="${this.fullRepaint}">
                        <i class="fas fa-reload"></i>
                    </div>
                </div>
                <div></div>
            </div>`;
    }

    getRelationInfo(fromNodeId:string, toNodeId: string): LocusRelation {
        return this.relations.find(function (x) {
            return x.uid_locus === fromNodeId && x.uid_locus_related === toNodeId
        })
    }

    renderRelation(r: [string, string, number]) {
        const relationInfo = this.getRelationInfo(r[0], r[1])
        if (relationInfo) {
            return html`
                <div class="removed-relation">${relationInfo.arch_context}</br>
                    ${r[2] == ERR_CONTRADICTION?
                          html`<i></i>${getChronType(relationInfo.chronology,relationInfo.relation_type)}`:
                          html`<i></i>${getChronType(relationInfo.chronology,relationInfo.relation_type)}`
                    }
                    (${relationInfo.relation_type?relationInfo.relation_type:"?"})</br>${relationInfo.related_arch_context===""?"?":relationInfo.related_arch_context}
                </div>`
        } else return nothing
    }

    renderDroppedRelation(r: DroppedRelation) {
        if (r.locusRelation) {
            return html`
                <div class="removed-relation">${r.locusRelation.arch_context}</br>
                    ${(r.reason == ERR_NON_TEMPORAL_RELATION || r. reason == ERR_FAULTY)
                        ? html`<i></i> ${r.reason === ERR_NON_TEMPORAL_RELATION?"non-temporal":"faulty"}`
                        : html`<i></i>${getChronType(r.locusRelation.chronology, r.locusRelation.relation_type)} (${r.locusRelation.relation_type})`
                    }
                    </br>${r.locusRelation.related_arch_context===""?"?":r.locusRelation.related_arch_context}
                </div>`
        } else return nothing;
    }

    renderMatrix() {
        const hasRelationsWithErrors = this.relationsWithErrors && this.relationsWithErrors.removed.length > 0
        const hasDroppedRelations = this.droppedLocusRelations && this.droppedLocusRelations.length > 0

        return html`
            <div id="matrixContainer" class="horizontal-frame ${(this.showRelationsWithErrors && (hasRelationsWithErrors || hasDroppedRelations))?'hf-2-cols':''}">
                ${(this.showRelationsWithErrors && (hasRelationsWithErrors || hasDroppedRelations))?html`
                    <div class="removed-relations">
                        ${hasRelationsWithErrors?html`
                        <div class="removed-relation-header">Removed relations that were part of a cycle or contradictory</div>
                        ${this.relationsWithErrors.removed.map(r => this.renderRelation(r))}
                        `:nothing}
                        ${hasDroppedRelations?html`
                        <div class="removed-relation-header">relations with missing information</div>
                        ${this.droppedLocusRelations.map(r => this.renderDroppedRelation(r))}
                        `:nothing}
                    </div>
                    `:nothing}
                <div id="hm-frame" class="hm-frame">
                    <hm-component tabindex="-1" id="hm" @hm-repaint="${this.hmUpdated}"></hm-component>
                </div>
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
                            .recordTypeAliases="${this.recordTypeAliases}"
                            .recordTypeFilter="${['unit','locus']}"
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
        return html`<div class="header-frame">${this.renderProgress()}${this.renderErrors()}${dev}${toolbar}</div>${app}`;
    }
}

window.customElements.define("hmlab-app", HmLabApp);
