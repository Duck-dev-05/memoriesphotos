const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const csharpModelsPath = path.join(__dirname, '../../MemoriesPhotoApplications/MemoriesPhotoApplications/Models');
const dartModelsPath = path.join(__dirname, '../../memoriesandroidapplication/lib/core/models');

const csharpNamespace = 'MemoriesPhotoApplications.Models';

const typeMappingCSharp = {
    'String': 'string',
    'Int': 'int',
    'Float': 'double',
    'Boolean': 'bool',
    'DateTime': 'DateTime',
};

const typeMappingDart = {
    'String': 'String',
    'Int': 'int',
    'Float': 'double',
    'Boolean': 'bool',
    'DateTime': 'DateTime',
};

function parseSchema() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const models = [];
    let currentModel = null;

    const lines = schema.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('model ')) {
            const name = trimmed.split(' ')[1];
            currentModel = { name, fields: [] };
            models.push(currentModel);
        } else if (trimmed.startsWith('}')) {
            currentModel = null;
        } else if (currentModel && trimmed && !trimmed.startsWith('@@')) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
                const name = parts[0];
                const rawType = parts[1];
                if (name && rawType) {
                    const isOptional = rawType.endsWith('?');
                    const isArray = rawType.endsWith('[]');
                    const typeBase = rawType.replace('?', '').replace('[]', '');
                    const isId = trimmed.includes('@id');
                    
                    // Don't include relations that are arrays
                    if (isArray && !typeMappingCSharp[typeBase]) continue;

                    currentModel.fields.push({
                        name,
                        typeBase,
                        isOptional,
                        isArray,
                        isId
                    });
                }
            }
        }
    }
    return models;
}

function generateCSharp(models) {
    if (!fs.existsSync(csharpModelsPath)) fs.mkdirSync(csharpModelsPath, { recursive: true });

    models.forEach(model => {
        let content = `using System;\nusing SQLite;\nusing System.Collections.Generic;\n\nnamespace ${csharpNamespace}\n{\n`;
        content += `    // AUTO-GENERATED. Use partial classes to extend.\n`;
        content += `    public partial class ${model.name}\n    {\n`;

        model.fields.forEach(f => {
            const isRelational = !typeMappingCSharp[f.typeBase];
            if (isRelational) return; // Skip complex relations for pure SQLite models
            
            let csType = typeMappingCSharp[f.typeBase];
            if (f.isOptional && csType !== 'string') {
                csType += '?';
            }
            
            if (f.isId) {
                content += `        [PrimaryKey]\n`;
            }
            // Auto capitalize properties for C# conventions
            const propName = f.name.charAt(0).toUpperCase() + f.name.slice(1);
            content += `        public ${csType} ${propName} { get; set; }\n`;
        });

        content += `    }\n}\n`;
        fs.writeFileSync(path.join(csharpModelsPath, `${model.name}.Generated.cs`), content);
    });
}

function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

function generateDart(models) {
    if (!fs.existsSync(dartModelsPath)) fs.mkdirSync(dartModelsPath, { recursive: true });

    models.forEach(model => {
        const fileName = `${toSnakeCase(model.name)}.dart`;
        let content = `// AUTO-GENERATED. Do not edit.\n\n`;
        content += `class ${model.name} {\n`;
        
        // Fields
        model.fields.forEach(f => {
            const isRelational = !typeMappingDart[f.typeBase];
            if (isRelational) return;
            
            let dType = typeMappingDart[f.typeBase];
            let opt = f.isOptional ? '?' : '';
            content += `  final ${dType}${opt} ${f.name};\n`;
        });

        if (model.name === 'Album') {
            content += `  final int photoCount;\n`;
        }
        content += `\n  ${model.name}({\n`;
        model.fields.forEach(f => {
            const isRelational = !typeMappingDart[f.typeBase];
            if (isRelational) return;
            
            const req = f.isOptional ? '' : 'required ';
            content += `    ${req}this.${f.name},\n`;
        });
        if (model.name === 'Album') {
            content += `    this.photoCount = 0,\n`;
        }
        content += `  });\n\n`;

        // toMap
        content += `  Map<String, dynamic> toMap() {\n    return {\n`;
        model.fields.forEach(f => {
            const isRelational = !typeMappingDart[f.typeBase];
            if (isRelational) return;
            
            if (f.typeBase === 'DateTime') {
                if (f.isOptional) {
                    content += `      '${f.name}': ${f.name}?.toIso8601String(),\n`;
                } else {
                    content += `      '${f.name}': ${f.name}.toIso8601String(),\n`;
                }
            } else {
                content += `      '${f.name}': ${f.name},\n`;
            }
        });
        if (model.name === 'Album') {
            content += `      'photoCount': photoCount,\n`;
        }
        content += `    };\n  }\n\n`;

        // fromMap
        content += `  factory ${model.name}.fromMap(Map<String, dynamic> map) {\n    return ${model.name}(\n`;
        model.fields.forEach(f => {
            const isRelational = !typeMappingDart[f.typeBase];
            if (isRelational) return;
            
            let mapExtract = `map['${f.name}']`;
            let dType = typeMappingDart[f.typeBase];
            
            if (f.typeBase === 'DateTime') {
                if (f.isOptional) {
                    content += `      ${f.name}: ${mapExtract} != null ? DateTime.tryParse(${mapExtract}.toString()) : null,\n`;
                } else {
                    content += `      ${f.name}: DateTime.parse(${mapExtract}.toString()),\n`;
                }
            } else if (f.typeBase === 'Boolean') {
                if (f.isOptional) {
                    content += `      ${f.name}: ${mapExtract} == null ? null : (${mapExtract} == true || ${mapExtract} == 1),\n`;
                } else {
                    content += `      ${f.name}: ${mapExtract} == true || ${mapExtract} == 1,\n`;
                }
            } else if (f.typeBase === 'Float') {
                if (f.isOptional) {
                    content += `      ${f.name}: (${mapExtract} as num?)?.toDouble(),\n`;
                } else {
                    content += `      ${f.name}: (${mapExtract} as num).toDouble(),\n`;
                }
            } else {
                content += `      ${f.name}: ${mapExtract} as ${dType}${f.isOptional ? '?' : ''},\n`;
            }
        });
        if (model.name === 'Album') {
            content += `      photoCount: map['photoCount'] as int? ?? 0,\n`;
        }
        content += `    );\n  }\n`;

        content += `}\n`;
        fs.writeFileSync(path.join(dartModelsPath, fileName), content);
    });
}

const models = parseSchema();
generateCSharp(models);
generateDart(models);
console.log('Model sync complete.');
