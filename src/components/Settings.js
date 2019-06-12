import React, { PureComponent } from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	Animated,
	LayoutAnimation,
	ScrollView,
	Switch,
	ActivityIndicator,
	Platform,
	TextInput
} from "react-native";
import PropTypes from "prop-types";
import { systemWeights } from "react-native-typography";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import DefaultModal from "./DefaultModal";
import XButton from "./XButton";
import Fade from "./Fade";
import PinPad from "./PinPad";
import ImportPhrase from "./ImportPhrase";
import ElectrumOptions from "./ElectrumOptions";
import * as electrum from "../utils/electrum";

const {
	Constants: {
		colors
	}
} = require("../../ProjectData.json");

const {
	resetKeychainValue,
	getKeychainValue,
	capitalize,
	getExchangeRate,
	openUrl,
	setKeychainValue
} = require("../utils/helpers");
const {
	getCoinData,
	defaultWalletShape
} = require("../utils/networks");
const moment = require("moment");

const generalHelpItems = [
	{
		title: "Enable Pin:",
		text: "This option allows you to toggle the Pin on/off as a form of authentication when opening this app. Please be warned, if you enable this option and forget your pin the app's data will be wiped after 5 failed attempts. Make sure to write down your mnemonic phrase prior to enabling this option."
	},
	{
		title: "Enable Testnet:",
		text: "This option allows you to toggle the Testnet coins on/off from the coin selection menu. If you do not require the use of any Testnet coins feel free to disable this option."
	},
	{
		title: "Enable RBF (Replace-By-Fee):",
		text: "This option allows you to toggle RBF (Replace-By-Fee) on/off for Bitcoin & Bitcoin Testnet. By enabling this option you are able to increase the fee of a sent, 0-confirmation transaction. This ultimately allows you to decrease the amount of time you have to wait for the transaction to confirm. Note: You are only able to increase the fee of 0-confirmation transactions that were sent while this option was enabled."
	},
	{
		title: "Send Transaction Fallback:",
		text: "If Electrum fails to broadcast a transaction for any reason this option, if enabled, will allow the app to use either Blockstream's api for Bitcoin or Chain.so's api for Litecoin to broadcast the transaction instead."
	},
	{
		title: "Exchange Rate Source:",
		text: `This option allows you to select where the app sources its data to determine the fiat price of Bitcoin & Litecoin.`
	},
	{
		title: "Crypto Units:",
		text: `This option allows you to select the specific crypto unit used to display the amount of Bitcoin & Litecoin in your wallet. Ex:\n1 BTC = 100,000,000 Satoshi\n1 Satoshi = 0.00000001 BTC`
	},
	{
		title: "Import Mnemonic Phrase:",
		text: "This option allows you to import a mnemonic seed or phrase. It can be commonly referred to as a seed phrase, seed recovery phrase or backup seed phrase and is usually a series of 12-24 words which store all the information needed to recover your wallet. This phrase is meant to be kept secret and should be written down and stored in a safe place in case you lose access to your wallet and need to recover your funds."
	},
	{
		title: "Electrum Options:",
		text: "This option allows you to input and connect to an electrum server of your choosing. Once added the app will utilize this server for all electrum related queries and cease using the default random servers."
	}
];

const walletHelpItems = [
	{
		title: "Connected To:",
		text: `This option displays the Electrum server that you are currently connected to. At the time of this writing, tapping this option will connect you to a new Electrum server at random. If you have added a custom Electrum server via the "Electrum Options" menu for this coin the app will simply attempt to disconnect and reconnect to the specified server.`
	},
	{
		title: "Address Type:",
		text: `This option allows you to toggle between multiple address types for Bitcoin & Litecoin. At the time of this writing, the default is "Bech32" which will generate bc1 addresses for Bitcoin, tb1 addresses for Bitcoin Testnet, ltc1 addresses for Litecoin & tltc1 addresses for Litecoin Testnet.`
	},
	{
		title: "Key Derivation Path:",
		text: "This option allows you to toggle between common derivation paths used by other wallets and is most helpful to those with imported mnemonic phrases from wallets utilizing a different path."
	},
	{
		title: "BIP39 Passphrase:",
		text: "A BIP39 passphrase is completely optional. When included, the passphrase is mixed with the selected wallet's mnemonic phrase to create a unique master seed. Including a passphrase significantly increases the security of your wallet as an attacker would not only need to know what your mnemonic phrase is they would also need to know the passphrase in order to gain access to your funds. However, this also works the other way around. In order to recover funds you will need both the mnemonic phrase and the passphrase. So long as you understand and are comfortable with this, adding a passphrase is highly recommended."
	},
	{
		title: "Wallet Backup:",
		text: "Tapping this item displays the mnemonic phrase for the currently selected wallet. This phrase is meant to be kept secret and should be written down and stored in a safe place in case you lose access to your wallet and need to recover your funds."
	},
	{
		title: "Rescan Wallet:",
		text: `Tapping this item prompts the wallet to rescan all addresses based on the selected "Key Derivation Path" starting at 0.`
	},
];

class Settings extends PureComponent<Props> {
	constructor(props) {
		super(props);
		this.state = {
			displaySettings: true,
			settingsOpacity: new Animated.Value(1),

			displayPin: false,
			pinOpacity: new Animated.Value(0),

			displayBackupPhrase: false,
			backupPhraseOpacity: new Animated.Value(0),
			backupPhrase: "",

			displayImportPhrase: false,
			importPhraseOpacity: new Animated.Value(0),

			displayElectrumOptions: false,
			electrumOptionsOpacity: new Animated.Value(0),

			rescanningWallet: false,
			connectingToElectrum: false,
			
			displayGeneralHelp: false,
			displayWalletHelp: false,
			
			bip39PassphraseIsSet: false,
			bip39Passphrase: ""
		};
	}
	
	async componentDidMount() {
		//Attempt to determine if the bip39Passphrase is set
		try {
			const key = `${this.props.wallet.selectedWallet}passphrase`;
			const bip39PassphraseResult = await getKeychainValue({ key });
			if (bip39PassphraseResult.error === false && bip39PassphraseResult.data.password) {
				this.setState({ bip39PassphraseIsSet: true });
			}
		} catch (e) {}
	}

	componentDidUpdate() {
		Platform.OS === "ios" ? LayoutAnimation.easeInEaseOut() : null;
	}

	HeaderRow({ header = "", title = "", value = "", col1Loading = false, col2Loading = false, col1Image = "", col1ImageColor = colors.purple, col2Image = "", onPress = () => null, headerStyle = {}, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle= {} } = {}) {
		try {
			return (
				<TouchableOpacity onPress={() => onPress(value)} activeOpacity={1} style={styles.rowContainer}>
					<View style={styles.row}>

						<View style={{ flex: 1 }}>
							<View style={{ alignItems: "center", justifyContent: "center" }}>
								{!col1Loading && col1Image === "" &&
								<View style={[styles.header, col1Style]}>
									<Text style={[styles.title, headerStyle]}>{header}</Text>
								</View>}
							</View>
							<View style={{ flexDirection: "row" }}>
								{!col1Loading && col1Image === "" &&
								<View style={[styles.col1, col1Style]}>
									<Text style={[styles.title, titleStyle]}>{title}</Text>
								</View>}
								{col1Loading &&
								<View style={[styles.col1, col1Style]}>
									<ActivityIndicator size="large" color={colors.lightPurple} />
								</View>}
								{!col1Loading && col1Image !== "" &&
								<View style={[styles.col1, col1Image]}>
									<MaterialCommunityIcons name={col1Image} size={50} color={col1ImageColor} />
								</View>
								}

								{!col2Loading && col2Image === "" &&
								<View style={[styles.col2, col2Style]}>
									<Text style={[styles.text, valueStyle]}>{value}</Text>
								</View>}
								{col2Loading &&
								<View style={[styles.col2, col2Style]}>
									<ActivityIndicator size="large" color={colors.lightPurple} />
								</View>}

								{!col2Loading && col2Image !== "" &&
								<View style={[styles.col2, col2Style]}>
									<MaterialCommunityIcons name={col2Image} size={50} color={colors.purple} />
								</View>
								}
							</View>
						</View>

					</View>
				</TouchableOpacity>
			);
		} catch (e) {
			console.log(e);
		}
	}

	Row({ title = "", value = "", col1Loading = false, col2Loading = false, col1Image = "", col1ImageColor = colors.purple, col2Image = "", rowStyle = { backgroundColor: colors.white }, onPress = () => null, col1Style = {}, col2Style = {}, titleStyle = {}, valueStyle= {} } = {}) {
		try {
			return (
				<TouchableOpacity onPress={() => onPress(value)} activeOpacity={1} style={styles.rowContainer}>
					<View style={[styles.row, rowStyle]}>
						{!col1Loading && col1Image === "" &&
						<View style={[styles.col1, col1Style]}>
							<Text style={[styles.title, titleStyle]}>{title}</Text>
						</View>}
						{col1Loading &&
						<View style={[styles.col1, col1Style]}>
							<ActivityIndicator size="large" color={colors.lightPurple} />
						</View>}
						{!col1Loading && col1Image !== "" &&
						<View style={[styles.col1, col1Image]}>
							<MaterialCommunityIcons name={col1Image} size={50} color={col1ImageColor} />
						</View>
						}

						{!col2Loading && col2Image === "" &&
						<View style={[styles.col2, col2Style]}>
							<Text style={[styles.text, valueStyle]}>{value}</Text>
						</View>}
						{col2Loading &&
						<View style={[styles.col2, col2Style]}>
							<ActivityIndicator size="large" color={colors.lightPurple} />
						</View>}

						{!col2Loading && col2Image !== "" &&
						<View style={[styles.col2, col2Style]}>
							<MaterialCommunityIcons name={col2Image} size={50} color={colors.purple} />
						</View>
						}

					</View>
				</TouchableOpacity>
			);
		} catch (e) {
			console.log(e);
		}
	}

	SwitchRow({ title = "", value = "", onPress = () => null, setting = "", col1Style = {}, col2Style = {}, titleStyle = {} } = {}) {
		try {
			return (
				<TouchableOpacity onPress={() => onPress(setting)} activeOpacity={1} style={styles.rowContainer}>
					<View style={[styles.row, { paddingHorizontal: 10 }]}>
						<View style={[styles.col1, { flex: 0.6, alignItems: "flex-start" }, col1Style]}>
							<Text style={[styles.title, titleStyle]}>{title}</Text>
						</View>
						<TouchableOpacity onPress={() => onPress(value)} style={[styles.col2, { flex: 0.4, alignItems: "flex-end" }, col2Style]}>
							<Switch ios_backgroundColor={colors.gray} thumbColor={colors.purple} trackColor={{false: colors.lightGray, true: colors.gray}} value={this.props.settings[setting]} onValueChange={() => onPress(setting)} />
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			);
		} catch (e) {
			console.log(e);
		}
	}
	
	_displayOption({ value = "", currentValue = "", onPress = () => null, optionsLength = 1 } = {}) {
		let width = 90/(optionsLength).toFixed(0);
		width = width.toString();
		width = `${width}%`;
		const isMatch = currentValue.toLowerCase() === value.toLowerCase();
		return (
			<TouchableOpacity key={value} onPress={onPress} style={[styles.cryptoUnitButton, { width, backgroundColor: isMatch ? colors.lightPurple : colors.white }]}>
				<Text style={[styles.text, { color: isMatch ? colors.white : colors.purple}]}>{value}</Text>
			</TouchableOpacity>
		);
	}
	MultiOptionRow({ title = "", subTitle = "", currentValue = "", options = [{ value: "", onPress: () => null }], subTitleIsLink = false } = {}) {
		const optionsLength = options.length;
		try {
			return (
				<View style={styles.rowContainer}>
					<View style={styles.row}>
						<View>
							<View style={{ alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
								<Text style={styles.title}>{title}</Text>
								{subTitle !== "" && !subTitleIsLink && <Text style={styles.subTitle}>{subTitle}</Text>}
								{subTitle !== "" && subTitleIsLink &&
								<TouchableOpacity onPress={() => openUrl(`https://${subTitle}`)} style={{ alignItems: "center", justifyContent: "center" }}>
									<Text style={styles.subTitle}>{subTitle}</Text>
								</TouchableOpacity>}
							</View>
							<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 20 }}>
								{options.map((option) => this._displayOption({ ...option, optionsLength, currentValue}))}
							</View>
						</View>
					</View>
				</View>
			);
		} catch (e) {}
	}
	
	TextInputRow({ title = "", subTitle = "", currentValue = "", onChangeText = () => null, onPress = () => null } = {}) {
		try {
			return (
				<View style={styles.rowContainer}>
					<View style={styles.row}>
						<View>
							<View style={{ alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
								<Text style={styles.title}>{title}</Text>
								<TextInput
									style={styles.textInput}
									secureTextEntry={true}
									autoCapitalize="none"
									selectionColor={colors.lightPurple}
									onChangeText={onChangeText}
									value={currentValue}
									placeholder={subTitle}
									autoCorrect={false}
									autoCompleteType={false}
								/>
							</View>
							<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 20 }}>
								{this._displayOption({ value: "Add Passphrase", optionsLength: 1, currentValue: "Add Passphrase", onPress})}
							</View>
						</View>
					</View>
				</View>
			);
		} catch (e) {}
	}
	
	updateItems = (items = []) => {
		return new Promise(async (resolve) => {
			try {
				let itemsToDisplay = {};
				let itemsToHide = {};
				let animations = [];
				let onCompleteFuncs = [];
				
				await Promise.all(items.map(async ({ stateId = "", opacityId = "", display = false, duration = 400, onComplete = null } = {}) => {
					try {
						//Handle Opacity Animations
						
						//Return if the desired value is already set for the given stateId
						if (this.state[stateId] === display) return;
						
						//Push all onComplete functions into an array to call once the animation completes
						try {if (typeof onComplete === "function") onCompleteFuncs.push(onComplete);} catch (e) {}
						try {
							
							//Set the items to display and hide in the appropriate object.
							if (display) {
								itemsToDisplay = {...itemsToDisplay, [stateId]: display};
							} else {
								itemsToHide = {...itemsToHide, [stateId]: display};
							}
							
							//Construct and push each animation to the animations array.
							animations.push(
								Animated.timing(
									this.state[opacityId],
									{
										toValue: display ? 1 : 0,
										duration,
										useNativeDriver: true
									}
								),
							);
						} catch (e) {console.log(e);}
					} catch (e) {}
				}));
				//Display necessary items
				if (Object.entries(itemsToDisplay).length !== 0 && itemsToDisplay.constructor === Object) this.setState(itemsToDisplay);
				//Start Animations.
				Animated.parallel(animations).start(async() => {
					//Perform any other action after the update has been completed.
					//Hide necessary items
					if (Object.entries(itemsToHide).length !== 0 && itemsToHide.constructor === Object) this.setState(itemsToHide);
					
					//Call all onComplete functions
					onCompleteFuncs.map((onComplete) => {try {onComplete();} catch (e) {}});
					resolve({ error: false });
				});
				
			} catch (e) {
				console.log(e);
				resolve({ error: true, data: e });
			}
		});
	};
	
	toggleTestnet = async () => {
		try {
			this.props.updateSettings({ testnet: !this.props.settings.testnet });
		} catch (e) {
			console.log(e);
		}
	};
	
	toggleRBF = async () => {
		try {
			this.props.updateSettings({ rbf: !this.props.settings.rbf });
		} catch (e) {
			console.log(e);
		}
	};
	
	toggleSendTransactionFallback = async () => {
		try {
			this.props.updateSettings({ sendTransactionFallback: !this.props.settings.sendTransactionFallback });
		} catch (e) {
			console.log(e);
		}
	};
	
	togglePin = async () => {
		try {
			if (this.props.settings.pin) {
				//Reset Previous Pin & Set Pin To False In Settings.
				await resetKeychainValue({ key: "pin" });
				this.props.updateSettings({ pin: false });
			} else {
				//Prompt User To Set A Pin.
				this.props.updateSettings({ pin: true });
				const items = [
					{ stateId: "displayPin", opacityId: "pinOpacity", display: true },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: false },
				];
				this.updateItems(items);

			}
		} catch (e) {
			console.log(e);
		}
	};

	toggleSetting = (setting = "") => {
		this.props.updateSettings({ [setting]: !this.props.settings[setting] });
	};

	onPinSuccess = () => {
		try {
			//Hide the PinPad View
			//Show the Settings View
			const items = [
				{ stateId: "displayPin", opacityId: "pinOpacity", display: false },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true },
			];
			this.updateItems(items);
		} catch (e) {
			console.log(e);
		}
	};

	onBack = () => {
		try {
			//If the user cancels out of the PinPad view
			if (this.state.displayPin) {
				//Remove Saved Pin
				resetKeychainValue({ key: "pin" });
				//Hide the PinPad View
				//Show the Settings View
				const items = [
					{ stateId: "displayPin", opacityId: "pinOpacity", display: false },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true },
				];
				this.updateItems(items);
				
				//Set pin to false in settings.
				this.props.updateSettings({ pin: false });
				return;
			}
			if (this.state.displayBackupPhrase) {
				this.toggleBackupPhrase({ selectedWallet: this.props.wallet.selectedWallet, display: false });
				return;
			}
			if (this.state.displayImportPhrase) {
				//Hide ImportPhrase component
				//Show the Settings View
				const items = [
					{ stateId: "displayImportPhrase", opacityId: "importPhraseOpacity", display: false },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true }
				];
				this.updateItems(items);
				return;
			}
			if (this.state.displayElectrumOptions) {
				//Hide ImportPhrase component
				//Show the Settings View
				const items = [
					{ stateId: "displayElectrumOptions", opacityId: "electrumOptionsOpacity", display: false },
					{ stateId: "displaySettings", opacityId: "settingsOpacity", display: true }
				];
				this.updateItems(items);
				return;
			}
			this.props.onBack();
		} catch (e) {}
	};

	getBackupWalletValue = () => {
		try {
			const selectedWallet = this.props.wallet.selectedWallet;
			const walletName = this.props.wallet.selectedWallet.split('wallet').join('Wallet ');
			if (this.props.wallet[selectedWallet].hasBackedUpWallet) {
				return `${walletName} last backed up on\n${moment(this.props.wallet[selectedWallet].walletBackupTimestamp).format('l @ h:mm a')}.`;
			} else {
				return "Wallet has not\nbeen backed up.";
			}
		} catch (e) {
			console.log(e);
		}
	};

	toggleBackupPhrase = async ({ selectedWallet = "", display = false }) => {
		try {
			if (!selectedWallet) return;
			const items = [
				{ stateId: "displayBackupPhrase", opacityId: "backupPhraseOpacity", display },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: !display },
			];
			if (display) {
				//Fetch Recovery Phrase
				const keychainResult = await getKeychainValue({key: selectedWallet});
				if (keychainResult.error === true) return;
				const mnemonic = keychainResult.data.password;
				await this.setState({ backupPhrase: mnemonic });
				this.updateItems(items);
				this.props.updateWallet({
					[selectedWallet]: {
						...this.props.wallet[selectedWallet],
						hasBackedUpWallet: true,
						walletBackupTimestamp: moment()
					}
				});
			} else {
				this.setState({backupPhrase: ""});
				this.updateItems(items);
			}
		} catch (e) {
			console.log(e);
		}
	};

	toggleImportPhrase = async ({ display = false }) => {
		try {
			const items = [
				{ stateId: "displayImportPhrase", opacityId: "importPhraseOpacity", display },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: !display },
			];
			this.updateItems(items);
		} catch (e) {

		}
	};

	toggleElectrumOptions = async ({ display = false }) => {
		try {
			const items = [
				{ stateId: "displayElectrumOptions", opacityId: "electrumOptionsOpacity", display },
				{ stateId: "displaySettings", opacityId: "settingsOpacity", display: !display },
			];
			this.updateItems(items);
		} catch (e) {
			console.log(e);
		}
	};
	
	_resetWalletForPassphrase = async () => {
		try {
			const { selectedWallet } = this.props.wallet;
			const { lastUpdated, hasBackedUpWallet, walletBackupTimestamp, keyDerivationPath, addressType } = this.props.wallet[selectedWallet];
			this.props.updateWallet({
				[selectedWallet]: {
					...defaultWalletShape,
					lastUpdated,
					hasBackedUpWallet,
					walletBackupTimestamp,
					keyDerivationPath,
					addressType,
				}
			});
		} catch (e) {}
	};
	
	addBip39Passphrase = async () => {
		try {
			const passphrase = this.state.bip39Passphrase;
			if (!passphrase) return;
			const wallet = this.props.wallet.selectedWallet;
			const key = `${wallet}passphrase`;
			await setKeychainValue({ key, value: passphrase });
			this.setState({ bip39PassphraseIsSet: true });
			await this._resetWalletForPassphrase();
			this.rescanWallet();
		} catch (e) {
			console.log(e);
		}
	};
	
	removeBip39Passphrase = async () => {
		try {
			const wallet = this.props.wallet.selectedWallet;
			const key = `${wallet}passphrase`;
			this.setState({ bip39PassphraseIsSet: false });
			await resetKeychainValue({ key });
			await this._resetWalletForPassphrase();
			this.rescanWallet();
		} catch (e) {
			console.log(e);
		}
	};
	
	updateKeyDerivationPath = async ({ keyDerivationPath = "84", rescanWallet = true } = {}) => {
		try {
			await this.updateWallet({ data: [{ key: "keyDerivationPath", value: keyDerivationPath }] });
			if (rescanWallet) this.rescanWallet();
		} catch (e) {
			console.log(e);
		}
	};
	
	updateAddressType = async ({ addressType = "bech32", rescanWallet = true } = {}) => {
		try {
			let keyDerivationPath = "84";
			switch (addressType) {
				case "bech32":
					keyDerivationPath = "84";
					break;
				case "segwit":
					keyDerivationPath = "49";
					break;
				case "legacy":
					keyDerivationPath = "44";
					break;
				default:
					keyDerivationPath = "84";
					break;
			}
			await this.updateWallet({
				data:
					[
						{key: "addressType", value: addressType},
						{key: "keyDerivationPath", value: keyDerivationPath}
					]
			});
			if (rescanWallet) this.rescanWallet();
		} catch (e) {
			console.log(e);
		}
	};
	
	updateWallet = async ({ data = [] } = {}) => {
		try {
			if (!data) return;
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			
			let newData = {};
			await Promise.all(data.map(({ key = undefined, value = undefined } = {}) => {
					if (key && value) newData[key] = {...this.props.wallet[selectedWallet][key], [selectedCrypto]: value};
				})
			);
			await this.props.updateWallet({
				...this.props.wallet,
				[selectedWallet]: {
					...this.props.wallet[selectedWallet],
					...newData
				}
			});
		} catch (e) {
			console.log(e);
		}
	};

	reconnectToPeer = async () => {
		try {
			const selectedCrypto = this.props.wallet.selectedCrypto;
			await this.setState({ connectingToElectrum: true });
			await electrum.stop({ coin: selectedCrypto });
			const start = await electrum.start({
				coin: selectedCrypto,
				peers: this.props.settings.peers[selectedCrypto],
				customPeers: this.props.settings.customPeers[selectedCrypto]
			});
			if (start.error === false) {
				//Set the new electrum peer.
				this.props.updateSettings({ currentPeer: start.data });
			}
			await this.setState({ connectingToElectrum: false });
		} catch (e) {
			console.log(e);
		}
	};

	rescanWallet = async () => {
		try {
			await this.setState({ rescanningWallet: true });
			const { selectedWallet, selectedCrypto } = this.props.wallet;
			await this.props.updateWallet({
				[selectedWallet]: {
					...this.props.wallet[selectedWallet],
					addressIndex: {
						...this.props.wallet[selectedWallet].addressIndex,
						[selectedCrypto]: 0
					},
					changeAddressIndex: {
						...this.props.wallet[selectedWallet].changeAddressIndex,
						[selectedCrypto]: 0
					},
					addresses: {
						...this.props.wallet[selectedWallet].addresses,
						[selectedCrypto]: []
					},
					changeAddresses: {
						...this.props.wallet[selectedWallet].changeAddresses,
						[selectedCrypto]: []
					},
					transactions: {
						...this.props.wallet[selectedWallet].transactions,
						[selectedCrypto]: []
					},
					utxos: {
						...this.props.wallet[selectedWallet].utxos,
						[selectedCrypto]: []
					},
					confirmedBalance: {
						...this.props.wallet[selectedWallet].confirmedBalance,
						[selectedCrypto]: 0
					},
					unconfirmedBalance: {
						...this.props.wallet[selectedWallet].unconfirmedBalance,
						[selectedCrypto]: 0
					}
				}
			});
			await this.props.refreshWallet();
			await this.setState({ rescanningWallet: false });
		} catch (e) {
			console.log(e);
		}
	};

	getPeerInfo = () => {
		try {
			return { host: this.props.settings.currentPeer.host, port: this.props.settings.currentPeer.port };
		} catch (e) {
			return { host: "No peer connected", port: "" };
		}
	};

	updateCryptoUnit = (cryptoUnit = "satoshi") => {
		try {
			this.props.updateSettings({ cryptoUnit });
		} catch (e) {
			console.log(e);
		}
	};
	
	updateExchangeRateService = async ({ selectedService = "coingecko" } = {}) => {
		try {
			await this.props.updateSettings({ selectedService });
			const { selectedWallet, selectedCrypto, selectedCurrency } = this.props.wallet;
			const exchangeRate = await getExchangeRate({ selectedCrypto, selectedCurrency, selectedService });
			if (exchangeRate.error === false) {
				await this.props.updateWallet({
					exchangeRate: {
						...this.props.wallet.exchangeRate,
						[selectedCrypto]: exchangeRate.data
					}
				});
				
				try {
					const utxos = this.props.wallet[selectedWallet].utxos[selectedCrypto] || [];
					const blacklistedUtxos = this.props.wallet[selectedWallet].blacklistedUtxos[selectedCrypto];
					this.props.updateBalance({ utxos, blacklistedUtxos, selectedCrypto, selectedWallet, wallet: selectedWallet });
				} catch (e) {
					//console.log(e);
				}
			}
		} catch (e) {
			//console.log(e);
		}
	};
	
	getExchangeRateSourceUrl = ({ selectedService = "coingecko"} = {}) => {
		try {
			switch (selectedService) {
				case "coingecko":
					return "coingecko.com";
				case "coincap":
					return "coincap.io";
				default: return "?";
			}
		} catch (e) {
			return "?";
		}
	};

	getBackupPhrase = () => {
		const backupPhrase = this.state.backupPhrase.split(" ");
		let phrase = "";
		for (let i = 0; i < backupPhrase.length; i++) {
			try { if (backupPhrase[i]) phrase = phrase.concat(`${i + 1}.   ${backupPhrase[i]}\n`); } catch (e) {}
		}
		return phrase;
	};

	render() {
		const { selectedWallet, selectedCrypto } = this.props.wallet;
		let coinDataLabel = "?";
		try {coinDataLabel = getCoinData({ selectedCrypto, cryptoUnit: "BTC" });} catch (e) {}
		let keyDerivationPath = "84";
		try {keyDerivationPath = this.props.wallet[selectedWallet].keyDerivationPath[selectedCrypto];} catch (e) {}
		let isTestnet = true;
		try {isTestnet = selectedCrypto.includes("Testnet");} catch (e) {}
		let addressType = "bech32";
		try {addressType = this.props.wallet[selectedWallet].addressType[selectedCrypto];} catch (e) {}
		const walletName = selectedWallet.split('wallet').join('Wallet ');
		const cryptoLabel = capitalize(selectedCrypto);
		return (
			<View style={styles.container}>

				<Animated.View style={{ flex: 1, opacity: this.state.settingsOpacity }}>
					<ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{flexGrow:1}} style={{ flex: 1, paddingTop: 20 }}>
						<TouchableOpacity activeOpacity={1} style={styles.container}>
							
							<View style={{ alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
								<View style={[styles.header, { marginBottom: 5 }]}>
									
									<Text style={[styles.title, { color: colors.white, fontWeight: "bold" }]}>General Settings</Text>
									
									<TouchableOpacity onPress={() => this.setState({ displayGeneralHelp: true })} style={{ marginLeft: 10, alignItems: "center", justifyContent: "center" }}>
										<MaterialCommunityIcons name={"help-circle-outline"} size={26} color={colors.white} />
									</TouchableOpacity>
									
								</View>
								<View style={{ height: 1.5, backgroundColor: colors.white, width: "80%" }} />
							</View>
							
							{this.props.settings.biometricsIsSupported &&
								this.SwitchRow({ setting: "biometrics", title: `Enable ${this.props.settings.biometricTypeSupported}`, onPress: this.toggleSetting })
							}
							
							{this.SwitchRow({ setting: "pin", title: "Enable Pin", onPress: this.togglePin })}
							
							{this.SwitchRow({ setting: "testnet", title: "Enable Testnet", onPress: this.toggleTestnet })}
							
							{this.SwitchRow({ setting: "rbf", title: "Enable RBF", onPress: this.toggleRBF })}
							
							{this.SwitchRow({ setting: "sendTransactionFallback", title: "Send Transaction Fallback", onPress: this.toggleSendTransactionFallback })}
							
							{this.MultiOptionRow({
								title: "Exchange Rate Source",
								subTitle: this.getExchangeRateSourceUrl({ selectedService: this.props.settings.selectedService}),
								subTitleIsLink: true,
								currentValue: this.props.settings.selectedService,
								options:[
									{value: "Coingecko", onPress: () => this.updateExchangeRateService({ selectedService: "coingecko" }) },
									{value: "CoinCap", onPress: () => this.updateExchangeRateService({ selectedService: "coincap" }) }
								]
							})}

							<View style={styles.rowContainer}>
								<View style={styles.row}>
									<View>
										<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
											<Text style={styles.title}>Crypto Units</Text>
										</View>
										<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
											<TouchableOpacity onPress={() => this.updateCryptoUnit("BTC")} style={[styles.cryptoUnitButton, { backgroundColor: this.props.settings.cryptoUnit === "BTC" ? colors.lightPurple : colors.white }]}>
												<Text style={[styles.text, { color: this.props.settings.cryptoUnit === "BTC" ? colors.white : colors.purple}]}>{coinDataLabel.acronym}</Text>
											</TouchableOpacity>
											<TouchableOpacity onPress={() => this.updateCryptoUnit("satoshi")} style={[styles.cryptoUnitButton, { backgroundColor: this.props.settings.cryptoUnit === "satoshi" ? colors.lightPurple : colors.white }]}>
												<Text style={[styles.text, { color: this.props.settings.cryptoUnit === "satoshi" ? colors.white : colors.purple}]}>{coinDataLabel.satoshi}</Text>
											</TouchableOpacity>
										</View>
									</View>
								</View>
							</View>
							
							{this.Row({
								title: "",
								value: "Import Mnemonic Phrase",
								onPress: () => this.toggleImportPhrase({ display: true }),
								col1Image: "import",
								col1ImageColor: colors.purple,
								col1Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 10 },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 10 },
								titleStyle: { color: colors.purple },
								valueStyle: { color: colors.purple, fontSize: 16, textAlign: "center", fontWeight: "bold" }
							})}
							
							{this.Row({
								title: "",
								value: "Electrum Options",
								onPress: () => this.toggleElectrumOptions({ display: true }),
								col1Image: "alpha-e-box",
								col1ImageColor: colors.purple,
								col1Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 10 },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 10 },
								titleStyle: { color: colors.purple },
								valueStyle: { color: colors.purple, fontSize: 16, textAlign: "center", fontWeight: "bold" }
							})}
							
							<View style={{ alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
								<View style={styles.header}>
									
									<Text style={[styles.title, { color: colors.white, fontWeight: "bold", textAlign: "center" }]}>{`${walletName}:`}</Text>
									
									<TouchableOpacity onPress={() => this.setState({ displayWalletHelp: true })} style={{ marginLeft: 10, alignItems: "center", justifyContent: "center" }}>
										<MaterialCommunityIcons name={"help-circle-outline"} size={26} color={colors.white} />
									</TouchableOpacity>
								
								</View>
								<View style={[styles.header, { marginBottom: 5 }]}>
									
									<Text style={[styles.title, { color: colors.white, fontWeight: "bold", textAlign: "center" }]}>{`${cryptoLabel} Settings`}</Text>
									
								</View>
								<View style={{ height: 1.5, backgroundColor: colors.white, width: "80%" }} />
							</View>

							{this.HeaderRow({
								header: "Connected To:",
								value: `${this.getPeerInfo().host}:${this.getPeerInfo().port}`,
								onPress: this.reconnectToPeer,
								col2Loading: this.state.connectingToElectrum || !this.getPeerInfo().host,
								col1Style: { flex: 0 },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 10, marginTop: 5 }
							})}
							
							{this.MultiOptionRow({
								title: "Address Type",
								currentValue: addressType,
								options:[
									{value: "Legacy", onPress: () => this.updateAddressType({ addressType: "legacy" }) },
									{value: "Segwit", onPress: () => this.updateAddressType({ addressType: "segwit" }) },
									{value: "Bech32", onPress: () => this.updateAddressType({ addressType: "bech32" }) },
								]
							})}
							
							{this.MultiOptionRow({
								title: "Key Derivation Path",
								subTitle: `m/${keyDerivationPath}'/0'/0'/${isTestnet ? 1 : 0}/0`,
								currentValue: keyDerivationPath,
								options:[
									{value: "0", onPress: () => this.updateKeyDerivationPath({ keyDerivationPath: "0" }) },
									{value: "44", onPress: () => this.updateKeyDerivationPath({ keyDerivationPath: "44" }) },
									{value: "49", onPress: () => this.updateKeyDerivationPath({ keyDerivationPath: "49" }) },
									{value: "84", onPress: () => this.updateKeyDerivationPath({ keyDerivationPath: "84" }) },
								]
							})}
							
							{!this.state.bip39PassphraseIsSet &&
							this.TextInputRow({
								title: "BIP39 Passphrase",
								subTitle: "Enter your passphrase here...",
								currentValue: this.state.bip39Passphrase,
								onChangeText: (bip39Passphrase) => this.setState({bip39Passphrase}),
								onPress: this.addBip39Passphrase
							})
							}
							
							{this.state.bip39PassphraseIsSet &&
							this.MultiOptionRow({
								title: "BIP39 Passphrase",
								subTitle: "o-o-o-o",
								currentValue: "Remove Passphrase",
								options:[
									{value: "Remove Passphrase", onPress: this.removeBip39Passphrase }
								]
							})
							}

							{this.Row({
								title: "Backup Wallet",
								value: this.getBackupWalletValue(),
								onPress: () => this.toggleBackupPhrase({ selectedWallet, display: true }),
								rowStyle: this.props.wallet[selectedWallet].hasBackedUpWallet ? { backgroundColor: colors.white } : { backgroundColor: colors.red },
								col1Image: "wallet",
								col1ImageColor: this.props.wallet[selectedWallet].hasBackedUpWallet ? colors.purple : colors.white,
								col1Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 10 },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 10 },
								titleStyle: { color: this.props.wallet[selectedWallet].hasBackedUpWallet ? colors.purple : colors.white },
								valueStyle: { color: this.props.wallet[selectedWallet].hasBackedUpWallet ? colors.purple : colors.white, fontSize: 16, textAlign: "center", fontWeight: this.props.settings.hasBackedUpWallet ? "normal" : "bold" }
							})}

							{this.Row({
								value: `Rescan ${walletName}\n${cryptoLabel} Wallet`,
								col1Loading: this.state.rescanningWallet,
								col1Image: "radar",
								onPress: this.rescanWallet,
								valueStyle: { color: colors.purple, fontSize: 16, textAlign: "center", fontWeight: "bold" },
								col2Style: { flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center" },
							})}

							<View style={{ paddingVertical: 70 }} />
						</TouchableOpacity>

					</ScrollView>
					<View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
						<Fade size={100} />
					</View>
				</Animated.View>

				{this.state.displayPin &&
					<View style={styles.pinPad}>
						<PinPad onSuccess={this.onPinSuccess} pinSetup={true} />
					</View>
				}

				{this.state.displayBackupPhrase &&
				<Animated.View style={[styles.pinPad, { opacity: this.state.backupPhraseOpacity }]}>
					<Text style={[styles.headerText, { position: "absolute", top: 25, left: 0, right: 0 }]}> {walletName} </Text>
					{this.Row({
						value: this.getBackupPhrase(),
						onPress: () => this.toggleBackupPhrase({ selectedWallet, display: false }),
						col1Style: { flex: 0.1 },
						col2Style: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 30 },
						valueStyle: { color: colors.purple, textAlign: "left", paddingHorizontal: 20, fontWeight: "bold" }
					})}
				</Animated.View>
				}

				{this.state.displayImportPhrase &&
				<Animated.View style={[styles.pinPad, { opacity: this.state.importPhraseOpacity, zIndex: 500 }]}>
					<ImportPhrase onBack={this.onBack} createNewWallet={this.props.createNewWallet} />
				</Animated.View>
				}

				{this.state.displayElectrumOptions &&
				<Animated.View style={[styles.pinPad, { opacity: this.state.electrumOptionsOpacity, zIndex: 500 }]}>
					<ElectrumOptions onBack={this.onBack} />
				</Animated.View>
				}

				{!this.state.displayImportPhrase &&
				<Animated.View style={styles.xButton}>
					<XButton style={{ borderColor: "transparent", zIndex: 1000 }} onPress={this.onBack} />
				</Animated.View>}
				
				<DefaultModal
					isVisible={this.state.displayGeneralHelp}
					onClose={() => this.setState({ displayGeneralHelp: false })}
					contentStyle={styles.modalContent}
				>
					{this.props.settings.biometricsIsSupported &&
					<View style={styles.helpRow}>
						<Text style={styles.helpTitle}>Enable FaceID:</Text>
						<Text style={styles.helpText}>This option allows you to toggle FaceID on/off as a form of authentication when opening this app.</Text>
					</View>}
					{generalHelpItems.map(({ title, text }) => (
						<View key={title} style={styles.helpRow}>
							<Text style={styles.helpTitle}>{title}</Text>
							<Text style={styles.helpText}>{text}</Text>
						</View>
					))}
					<View style={{ paddingVertical: "40%" }} />
				</DefaultModal>
				
				<DefaultModal
					isVisible={this.state.displayWalletHelp}
					onClose={() => this.setState({ displayWalletHelp: false })}
					contentStyle={styles.modalContent}
				>
					{walletHelpItems.map(({ title, text }) => (
						<View key={title} style={styles.helpRow}>
							<Text style={styles.helpTitle}>{title}</Text>
							<Text style={styles.helpText}>{text}</Text>
						</View>
					))}
					<View style={{ paddingVertical: "40%" }} />
				</DefaultModal>

			</View>
		);
	}
}

Settings.defaultProps = {
	createNewWallet: () => null,
	onBack: () => null,
	refreshWallet: () => null
};

Settings.propTypes = {
	createNewWallet: PropTypes.func.isRequired,
	onBack: PropTypes.func.isRequired,
	refreshWallet: PropTypes.func.isRequired
};


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent"
	},
	rowContainer: {
		width: "100%",
		backgroundColor: "transparent",
		alignItems: "center",
		marginBottom: 20
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.white,
		borderRadius: 11.5,
		width: "80%",
		minHeight: 80,
		paddingVertical: 10
	},
	cryptoUnitButton: {
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 5,
		width: "40%",
		borderWidth: 1,
		borderColor: colors.lightPurple,
		marginHorizontal: 5,
		paddingVertical: 4
	},
	pinPad: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: "center",
		backgroundColor: "transparent"
	},
	col1: {
		flex: 0.4,
		alignItems: "center",
		justifyContent: "center",
	},
	col2: {
		flex: 0.6,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	helpRow: {
		marginBottom: 10,
	},
	helpTitle: {
		...systemWeights.semibold,
		color: colors.darkPurple,
		fontSize: 22,
		textAlign: "left"
	},
	helpText: {
		...systemWeights.regular,
		color: colors.darkPurple,
		fontSize: 18,
		textAlign: "left"
	},
	title: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 20,
		textAlign: "left"
	},
	text: {
		...systemWeights.regular,
		color: colors.purple,
		fontSize: 16,
		textAlign: "left"
	},
	subTitle: {
		...systemWeights.light,
		color: colors.purple,
		fontSize: 16,
		textAlign: "left"
	},
	header: {
		flexDirection: "row",
		alignItems: "center"
	},
	headerText: {
		...systemWeights.regular,
		color: colors.white,
		fontSize: 24,
		textAlign: "center"
	},
	xButton: {
		position: "absolute",
		alignItems: "center",
		left: 0,
		right: 0,
		bottom: 10
	},
	modalContent: {
		borderWidth: 5,
		borderRadius: 20,
		borderColor: colors.lightGray
	},
	textInput: {
		flex: 1,
		height: 30,
		width: "90%",
		borderRadius: 5,
		padding: 5,
		backgroundColor: colors.white,
		borderColor: colors.lightPurple,
		borderWidth: 1,
		color: colors.purple,
		fontWeight: "bold"
	},
});

const connect = require("react-redux").connect;
const bindActionCreators = require("redux").bindActionCreators;
const userActions = require("../actions/user");
const walletActions = require("../actions/wallet");
const transactionActions = require("../actions/transaction");
const settingsActions = require("../actions/settings");

const mapStateToProps = ({...state}) => ({
	...state
});

const mapDispatchToProps = (dispatch) => {
	const actions = {
		...userActions,
		...walletActions,
		...transactionActions,
		...settingsActions
	};
	return bindActionCreators({
		...actions
	}, dispatch);
};

module.exports = connect(mapStateToProps, mapDispatchToProps)(Settings);