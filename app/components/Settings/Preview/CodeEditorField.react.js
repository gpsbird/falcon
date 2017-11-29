'use es6';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {has, propOr} from 'ramda';
import CodeMirror from 'react-codemirror';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/sql-hint';
import {DIALECTS} from '../../../constants/constants';

class CodeEditorField extends Component {

    constructor(props) {
        super(props);
        this.autoComplete = this.autoComplete.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.injectAutocomplete = this.injectAutocomplete.bind(this);
    }

    static propTypes = {
        schemaRequest: PropTypes.object,
        preview: PropTypes.object,
        updatePreview: PropTypes.func,
        onChange: PropTypes.func,
        connectionObject: PropTypes.shape({dialect: PropTypes.string}),
        runQuery: PropTypes.func,
        value: PropTypes.string
    }

    injectAutocomplete() {
        const {schemaRequest, preview, updatePreview} = this.props;

        if (typeof schemaRequest !== 'undefined' && typeof preview !== 'undefined' &&
            schemaRequest.status === 200 && !has('codeSchema', preview)) {

            const codeSchema = {};
            const bareTableNames = {};
            schemaRequest.content.rows.forEach(function(row) {
                const [tableName, columnName, dataType] = row;

                let bareTableName = bareTableNames[tableName];
                if (!bareTableName) {
                    bareTableName = tableName.split('.').slice(-1)[0];

                    const first = bareTableName.charAt(0);
                    if (first === '"' || first === '\'') {
                        bareTableName = bareTableName.slice(1);
                    }

                    const last = bareTableName.charAt(bareTableName.length - 1);
                    if (last === '"' || last === '\'') {
                        bareTableName = bareTableName.slice(0, -1);
                    }

                    if (!bareTableName) return;

                    bareTableNames[tableName] = bareTableName;
                }

                if (codeSchema.hasOwnProperty(bareTableName)) {
                    codeSchema[bareTableName][columnName] = dataType;
                } else {
                    codeSchema[bareTableName] = {
                        [columnName]: dataType
                    };
                }
            });

            updatePreview({codeSchema});
        }
    }

    componentDidMount() {
        this.injectAutocomplete();
    }

    componentWillReceiveProps() {
        this.injectAutocomplete();
    }

    autoComplete(cm) {

        const codeMirror = this.refs.CodeMirror.getCodeMirrorInstance();

        // hint options for specific plugin & general show-hint
        // 'tables' is sql-hint specific
        // 'disableKeywords' is also sql-hint specific, and undocumented but referenced in sql-hint plugin
        // Other general hint config, like 'completeSingle' and 'completeOnSingleClick'
        // should be specified here and will be honored
        const hintOptions = {
            tables: propOr([], 'codeSchema', this.props.preview),
            completeSingle: false,
            completeOnSingleClick: true
        };

        // codeMirror.hint.sql is defined when importing codemirror/addon/hint/sql-hint
        // (this is mentioned in codemirror addon documentation)
        // Reference the hint function imported here when including other hint addons
        // or supply your own
        codeMirror.showHint(cm, codeMirror.hint.sql, hintOptions);
    }

    handleChange(newCode) {
        this.props.onChange(newCode);

        // Don't show autocomplete after a space or semicolon
        const cm = this.refs.CodeMirror.getCodeMirror();
        const ch = cm.getTokenAt(cm.getCursor()).string.slice(-1);
        if (ch && ch !== ' ' && ch !== ';') {
            this.autoComplete(cm);
        }
    }

    render() {
        const mode = {
            [DIALECTS.APACHE_SPARK]: 'text/x-sparksql',
            [DIALECTS.MYSQL]: 'text/x-mysql',
            [DIALECTS.SQLITE]: 'text/x-sqlite',
            [DIALECTS.MARIADB]: 'text/x-mariadb',
            [DIALECTS.POSTGRES]: 'text/x-pgsql',
            [DIALECTS.REDSHIFT]: 'text/x-pgsql',
            [DIALECTS.MSSQL]: 'text/x-mssql'
        }[this.props.connectionObject.dialect] || 'text/x-sql';

        const options = {
            lineNumbers: true,
            mode: mode,
            tabSize: 4,
            readOnly: false,
            extraKeys: {
                'Shift-Enter': this.props.runQuery
            }
        };

        return (
            <CodeMirror
                ref="CodeMirror"
                value={this.props.value}
                onChange={this.handleChange}
                options={options}
            />
        );
    }
}

export default CodeEditorField;
