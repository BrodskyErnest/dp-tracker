import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';

import Handsontable from 'handsontable';
import { HotTable, HotColumn } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.css';

import {
	platform_options,
	department_options,
	employee_options,
	format_options,
} from '../utils/constants';
import './App.css';

registerAllModules();

export const ExampleComponent = () => {
	const hotRef = useRef(null);
	const [projects, setProjects] = useState([]);
	let saveClickCallback;
	let exportClickCallback;

	function isISODate(dateString) {
		var regEx = /^\d{4}-\d{2}-\d{2}$/;

		if (!dateString.match(regEx)) return false;

		var d = new Date(dateString);
		var dNum = d.getTime();
		if (!dNum && dNum !== 0) return false;

		return d.toISOString().slice(0, 10) === dateString;
	}

	function isDotDate(dateString) {
		if (!/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateString)) return false;

		var parts = dateString.split('.');
		var day = parseInt(parts[0], 10);
		var month = parseInt(parts[1], 10);
		var year = parseInt(parts[2], 10);

		if (year < 1000 || year > 3000 || month == 0 || month > 12)
			return false;

		var monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

		if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
			monthLength[1] = 29;

		return day > 0 && day <= monthLength[month - 1];
	}

	async function upsertProjects(objects) {
		try {
			const { data, error } = await supabase
				.from('projects')
				.upsert(objects);
			if (error) throw error;
		} catch (e) {
			throw e;
		}
	}

	async function deleteProjects(objects) {
		try {
			const { error } = await supabase
				.from('projects')
				.delete()
				.in('id', objects);
			if (error) throw error;
		} catch (e) {
			throw e;
		}
	}

	useEffect(() => {
		async function getProjects() {
			const { data, error } = await supabase
				.from('projects')
				.select(
					'id,project_id,itime_id,wave,platform,path,department,manager,programming_programmer,programming_deadline,programming_materials,processing_processor,processing_deadline,processing_materials,datafile_processor,datafile_format,datafile_deadline,datafile_materials,programming_comments,processing_comments,audit'
				);
			if (error) console.error('Ошибка при загрузке данных: ', error);
			setProjects(data);
		}

		getProjects();
	}, []);

	useEffect(() => {
		const hot = hotRef.current.hotInstance;
		if (hot) {
			hot.loadData(projects);
			hot.addHook('afterLoadData', () => {
				const columnSorting = hot.getPlugin('columnSorting');
				columnSorting.sort({
					column: 0,
					sortOrder: 'desc',
				});
			});
		}
	}, [projects]);

	// useEffect(() => {
	// 	const hot = hotRef.current.hotInstance;

	// 	if (hot) {
	// 		hot.addHook('afterRemoveRow', (index, amount, physicalRows) => {
	// 			console.log(projects);
	// 			console.log(projects[physicalRows]);
	// 			console.log(index, amount, physicalRows);
	// 		});
	// 	}
	// }, [hotRef, projects]);

	useEffect(() => {
		const hot = hotRef.current.hotInstance;
		const exportPlugin = hot.getPlugin('exportFile');

		exportClickCallback = () => {
			exportPlugin.downloadFile('csv', {
				bom: false,
				columnDelimiter: ',',
				columnHeaders: false,
				exportHiddenColumns: true,
				exportHiddenRows: true,
				fileExtension: 'csv',
				filename: 'DP_Tracker_[DD].[MM].[YYYY]',
				mimeType: 'text/csv',
				rowDelimiter: '\r\n',
				rowHeaders: true,
			});
		};

		saveClickCallback = () => {
			const projects = hot.getSourceData();
			// console.log(projects);
			var maxId = projects.reduce((max, obj) => {
				return obj.id !== null && obj.id > max ? obj.id : max;
			}, 0);

			const usedIds = new Set();

			projects.forEach((obj, index) => {
				if (obj.id === null) {
					let newId = maxId + 1;

					while (usedIds.has(newId)) {
						newId++;
					}

					obj.id = newId;
					maxId = newId;
					usedIds.add(newId);
				}
			});

			const convertedProjects = projects.map((project) => {
				const dateProperties = Object.getOwnPropertyNames(
					project
				).filter(
					(property) =>
						property.endsWith('deadline') |
						property.endsWith('materials')
				);
				for (const property of dateProperties) {
					if (
						typeof project[property] === 'string' &&
						project[property].trim().length === 0
					) {
						project[property] = null;
					}
					if (
						isDotDate(project[property]) &&
						project[property] !== null
					) {
						const dateParts = project[property].split('.');
						const date = new Date(
							dateParts[2],
							dateParts[1] - 1,
							dateParts[0]
						);
						const offset = date.getTimezoneOffset() * 60000;

						const newDate = new Date(date - offset)
							.toISOString()
							.split('T')[0];
						project[property] = newDate;
					}
				}
				return project;
			});
			upsertProjects(convertedProjects);
		};
	});

	// const handleAfterCreateRow = (index, amount) => {
	// const newRow = projects[index];
	// console.log(projects);
	// console.log(newRow);
	// newRow.id =
	// 	projects.reduce((prev, current) =>
	// 		prev && prev.id > current.id ? prev : current
	// 	).id + 1;
	// };

	// const handleAfterLoadData = (sourceData, initialLoad, source) => {
	// console.log(sourceData, initialLoad, source);
	// const hot = hotRef.current.hotInstance;
	// hot.validateCells();
	// const columnSorting = hot.getPlugin('columnSorting');
	// columnSorting.sort({
	// 	column: 0,
	// 	sortOrder: 'desc',
	// });
	// };

	const DateRenderer = (props) => {
		const { value } = props;

		let dateCell = value;

		if (dateCell !== null) {
			if (isISODate(dateCell)) {
				const dateParts = dateCell.split('-');
				dateCell = dateParts[2].concat(
					'.',
					dateParts[1],
					'.',
					dateParts[0]
				);
			}
		}
		return <span>{dateCell}</span>;
	};

	return (
		<div>
			<div>
				{/* <button
					id="load"
					className="button"
					onClick={(...args) => loadClickCallback(...args)}>
					Загрузить
				</button> */}
				&nbsp;
				<button
					id="save"
					className="button"
					onClick={(...args) => saveClickCallback(...args)}>
					Сохранить
				</button>
				<button
					id="export-csv"
					onClick={(...args) => exportClickCallback(...args)}>
					CSV
				</button>
			</div>
			<HotTable
				ref={hotRef}
				rowHeaders={true}
				colWidths={[
					'1',
					'120',
					'40',
					'100',
					'140',
					'100',
					'100',
					'100',
					'175',
					'100',
					'100',
					'175',
					'100',
					'100',
					'175',
					'100',
					'100',
					'100',
					'150',
					'150',
					'100',
				]}
				colHeaders={[
					'UID',
					'Номер',
					'iTime',
					'волна/<br/>часть',
					'Платформа/<br/>метод',
					'Путь',
					'Отдел',
					'Менеджер',
					'Программист',
					'Сроки',
					'Дата<br/>получения<br/>материалов',
					'Обработчик',
					'Сроки',
					'Дата<br/>получения<br/>материалов',
					'Обработчик файла<br/>данных',
					'Формат',
					'Сроки',
					'Дата<br/>получения<br/>материалов',
					'Комментарии<br/>к программингу',
					'Комментарии<br/>к обработке',
					'Аудит',
				]}
				columnSorting={true}
				contextMenu={true}
				filters={true}
				dropdownMenu={true}
				height="100%"
				width="100%"
				className="custom-table"
				rowHeights={40}
				licenseKey="non-commercial-and-evaluation"
				// afterCreateRow={handleAfterCreateRow}
				// afterLoadData={handleAfterLoadData}
				beforeRemoveRow={function (index, amount, physicalRows) {
					const deletedIds = [];
					for (const row of physicalRows) {
						deletedIds.push(projects[row].id);
					}
					deleteProjects(deletedIds);
				}}
				// afterRemoveRow={function (index, amount, physicalRows) {
				// console.log(projects);
				// console.log(projects[physicalRows].id);
				// console.log(
				// 	index,
				// 	amount,
				// 	physicalRows,
				// 	projects[physicalRows]
				// );
				// deleteProjects(objects);
				// }}
				afterChange={function (change, source) {
					if (source === 'loadData') {
						// The table data has been loaded.
						return;
					}
				}}>
				<HotColumn
					data="id"
					type="numeric"
					wordWrap={false}
				/>
				<HotColumn
					data="project_id"
					wordWrap={false}
				/>
				<HotColumn
					data="itime_id"
					wordWrap={false}
				/>
				<HotColumn
					data="wave"
					wordWrap={false}
				/>
				<HotColumn
					data="platform"
					type="dropdown"
					source={platform_options}
				/>
				<HotColumn
					data="path"
					wordWrap={false}
				/>
				<HotColumn
					data="department"
					type="dropdown"
					source={department_options}
				/>
				<HotColumn
					data="manager"
					wordWrap={false}
				/>
				<HotColumn
					data="programming_programmer"
					type="dropdown"
					source={employee_options}
				/>
				<HotColumn
					data="programming_deadline"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}>
					<DateRenderer hot-renderer />
				</HotColumn>
				<HotColumn
					data="programming_materials"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}>
					<DateRenderer hot-renderer />
				</HotColumn>
				<HotColumn
					data="processing_processor"
					type="dropdown"
					source={employee_options}
				/>
				<HotColumn
					data="processing_deadline"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}>
					<DateRenderer hot-renderer />
				</HotColumn>
				<HotColumn
					data="processing_materials"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}>
					<DateRenderer hot-renderer />
				</HotColumn>
				<HotColumn
					data="datafile_processor"
					type="dropdown"
					source={employee_options}
				/>
				<HotColumn
					data="datafile_format"
					type="dropdown"
					source={format_options}
				/>
				<HotColumn
					data="datafile_deadline"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}>
					<DateRenderer hot-renderer />
				</HotColumn>
				<HotColumn
					data="datafile_materials"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}>
					<DateRenderer hot-renderer />
				</HotColumn>
				<HotColumn
					data="programming_comments"
					wordWrap={false}
				/>
				<HotColumn
					data="processing_comments"
					wordWrap={false}
				/>
				<HotColumn
					data="audit"
					wordWrap={false}
				/>
			</HotTable>
		</div>
	);
};

// function App() {
// 	const [projects, setProjects] = useState([]);

// 	useEffect(() => {
// 		getProjects();
// 	}, []);

// 	async function getProjects() {
// 		try {
// 			const { data, error } = await supabase.from('projects').select();
// 			if (error) throw error;
// 			setProjects(data);
// 		} catch (e) {
// 			throw e;
// 		}
// 	}

// 	return (
// 		<>
// 			<div>
// 				<ul>
// 					{projects.map((project) => (
// 						<li key={project.id}>{project.project_id}</li>
// 					))}
// 				</ul>
// 			</div>
// 		</>
// 	);
// }

// export default App;

// useEffect(() => {
// 	getProjects();
// }, []);

// function isEmptyRow(instance, row) {
// 	var rowData = instance.countRows();

// 	for (var i = 0, ilen = rowData.length; i < ilen; i++) {
// 		if (rowData[i] !== null) {
// 			return false;
// 		}
// 	}

// 	return true;
// }

// function defaultValueRenderer(
// 	instance,
// 	td,
// 	row,
// 	col,
// 	prop,
// 	value,
// 	cellProperties
// ) {
// 	var args = arguments;
// 	let max_obj = null;
// 	if (typeof projects !== 'undefined' && projects.length > 0) {
// 		max_obj = projects.reduce((prev, current) =>
// 			prev && prev.id > current.id ? prev : current
// 		);
// 	}

// 	if (args[5] === null && isEmptyRow(instance, row)) {
// 		args[5] = max_obj === null ? 1 : max_obj.id + 1;
// 		td.style.color = '#999';
// 	} else {
// 		td.style.color = '';
// 	}
// 	Handsontable.renderers.TextRenderer.apply(this, args);
// }

// cells={function (row, col, prop) {
// 	const cellProperties = {};

// 	cellProperties.renderer = defaultValueRenderer;

// 	return cellProperties;
// }}
// beforeChange={function(changes) {
//   const instance = hot;
//   const columns = instance.countCols();
//   const rowColumnSeen = {};
//   const rowsToFill = {};

//   for (let i = 0; i < changes.length; i++) {
//     // if oldVal is empty
//     if (changes[i][2] === null && changes[i][3] !== null) {
//       if (isEmptyRow(instance, changes[i][0])) {
//         // add this row/col combination to the cache so it will not be overwritten by the template
//         rowColumnSeen[changes[i][0] + '/' + changes[i][1]] = true;
//         rowsToFill[changes[i][0]] = true;
//       }
//     }
//   }

//   for (var r in rowsToFill) {
//     if (rowsToFill.hasOwnProperty(r)) {
//       for (let c = 0; c < columns; c++) {
//         // if it is not provided by user in this change set, take the value from the template
//         if (!rowColumnSeen[r + '/' + c]) {
//         changes.push([r, c, null, templateValues[c]]);
//       }
//     }
//   }
// }
// }}
// if (!isAutosave) {
// 	return;
// }

// fetch(
// 	'https://handsontable.com/docs/scripts/json/save.json',
// 	{
// 		method: 'POST',
// 		mode: 'no-cors',
// 		headers: {
// 			'Content-Type': 'application/json',
// 		},
// 		body: JSON.stringify({ data: change }),
// 	}
// ).then((response) => {
// 	setOutput(
// 		`Autosaved (${change.length} cell${
// 			change.length > 1 ? 's' : ''
// 		})`
// 	);
// 	console.log(
// 		'The POST request is only used here for the demo purposes'
// 	);
// });
