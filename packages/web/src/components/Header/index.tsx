import classNames from "classnames";
import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import HelpMenu from "./Help";
import { SecondaryButton } from "../../../../core/components/Buttons";
import { APPLICATION_NAME } from "../../constants";
import AICSLogo from "../../../assets/AICS-logo-and-name.svg";

import styles from "./Header.module.css";

export default function Header() {
    const navigate = useNavigate();
    const currentPath = useLocation().pathname;
    const isApp: boolean = currentPath == "/app";

    return (
        <>
            <div className={styles.header}>
                <div className={styles.left}>
                    <a href="https://www.allencell.org/" target="_blank" rel="noreferrer">
                        <AICSLogo />
                    </a>
                    <Link
                        to={"/"}
                        className={styles.title}
                        target={isApp ? "_blank" : "_self"}
                        rel="noreferrer"
                    >
                        <h4>{APPLICATION_NAME}</h4>
                    </Link>
                </div>
                <div className={styles.right}>
                    <Link
                        to={"datasets"}
                        className={classNames(styles.routeLink, styles.headerOption)}
                        target={isApp ? "_blank" : "_self"}
                        rel="noreferrer"
                    >
                        Open-source datasets
                    </Link>
                    <HelpMenu path={currentPath} />
                    {currentPath !== "/app" && (
                        <SecondaryButton
                            className={styles.startButton}
                            onClick={() => navigate("/app")}
                            title="Get started"
                            text="GET STARTED"
                        />
                    )}
                </div>
            </div>
        </>
    );
}